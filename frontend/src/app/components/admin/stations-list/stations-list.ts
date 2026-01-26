import { Component, inject, OnInit, signal } from '@angular/core';
import { Station, StationsService } from '../../../services/stations-service';
import { UsersService } from '../../../services/users-service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-stations-list',
  imports: [RouterLink],
  templateUrl: './stations-list.html',
  styleUrl: './stations-list.css',
})
export class StationsList implements OnInit {
  stationsService = inject(StationsService);
  usersService = inject(UsersService);

  showDeleteModal = signal(false);
  stationToDelete = signal<Station | null>(null);
  errorMessage = signal('');

  ngOnInit() {
    this.stationsService.loadStations();
    this.usersService.loadUsers();
  }

  getManagerEmail(managerId: number | null): string {
    if (!managerId) return 'Not assigned';
    const manager = this.usersService.users().find(u => u.id === managerId);
    return manager?.email || 'Unknown';
  }

  confirmDelete(station: Station) {
    this.stationToDelete.set(station);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.stationToDelete.set(null);
    this.showDeleteModal.set(false);
  }

  async deleteStation() {
    const station = this.stationToDelete();
    if (!station) return;

    try {
      await this.stationsService.deleteStation(station.id);
      this.cancelDelete();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}
