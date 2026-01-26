import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { StationsService } from '../../../services/stations-service';
import { User, UsersService } from '../../../services/users-service';
import { form, FormField } from '@angular/forms/signals';
import {
  createStationSchema,
  GOVERNORATES,
  StationFormData,
  stationInitialData,
} from '../../../models/stations';

@Component({
  selector: 'app-stations-form',
  imports: [FormsModule, FormField],
  templateUrl: './stations-form.html',
  styleUrl: './stations-form.css',
})
export class StationForm implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private stationsService = inject(StationsService);
  usersService = inject(UsersService);

  isEditMode = signal(false);
  stationId = signal<number | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  stationModel = signal<StationFormData>(stationInitialData);
  stationForm = form(this.stationModel, createStationSchema(this.isEditMode));

  governorates = GOVERNORATES;

  ngOnInit() {
    this.usersService.loadUsers();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.stationId.set(Number(id));
      this.loadStation(Number(id));
    }
  }

  get managers(): User[] {
    return this.usersService.users().filter((u) => u.role === 'manager' && u.is_active);
  }

  async loadStation(id: number) {
    try {
      const station = await this.stationsService.getStation(id);
      this.stationModel.set({
        name: station.name,
        code: station.code,
        address: station.address || '',
        governorate: station.governorate,
        isActive: station.is_active,
        managerId: station.manager_id,
      });
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  selectGovernorate(gov: string) {
    this.stationModel.update((data) => ({ ...data, governorate: gov }));
  }

  selectManager(managerId: number | null) {
    this.stationModel.update((data) => ({ ...data, managerId }));
  }

  toggleActive() {
    this.stationModel.update((data) => ({ ...data, isActive: !data.isActive }));
  }

  async onSubmit() {
    if (this.stationForm().invalid()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const data = this.stationModel();

    try {
      if (this.isEditMode()) {
        await this.stationsService.updateStation(this.stationId()!, {
          name: data.name,
          address: data.address || undefined,
          governorate: data.governorate,
          is_active: data.isActive,
        });

        const currentStation = await this.stationsService.getStation(this.stationId()!);
        if (currentStation.manager_id !== data.managerId) {
          await this.stationsService.assignManager(this.stationId()!, data.managerId);
        }
      } else {
        await this.stationsService.createStation({
          name: data.name,
          code: data.code,
          address: data.address || undefined,
          governorate: data.governorate,
        });
      }

      this.router.navigate(['/admin/stations']);
    } catch (error) {
      this.errorMessage.set(error as string);
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/admin/stations']);
  }
}
