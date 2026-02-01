import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { 
  ComplaintFormData, 
  complaintInitialData, 
  complaintSchema,
  COMPLAINT_TYPES,
  SEVERITY_LEVELS,
  ComplaintType
} from '../../../models/complaint';
import { ComplaintsService } from '../../../services/complaints-service';
import { StationsService, Station } from '../../../services/stations-service';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-new-complaint',
  imports: [FormField],
  templateUrl: './new-complaint.html',
  styleUrl: './new-complaint.css',
})
export class NewComplaint implements OnInit {
  private router = inject(Router);
  private complaintsService = inject(ComplaintsService);
  private stationsService = inject(StationsService);
  private authService = inject(AuthService);

  complaintModel = signal<ComplaintFormData>(complaintInitialData);
  complaintForm = form(this.complaintModel, complaintSchema);

  types = COMPLAINT_TYPES;
  severityLevels = SEVERITY_LEVELS;

  isLoading = signal(false);
  errorMessage = signal('');
  
  managerStations = computed<Station[]>(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return [];
    return this.stationsService.stations().filter(s => s.manager_id === currentUser.id);
  });

  ngOnInit() {
    this.stationsService.loadStations();
  }

  selectType(type: ComplaintType) {
    this.complaintModel.update(data => ({ ...data, type }));
  }

  selectSeverity(severity: number) {
    this.complaintModel.update(data => ({ ...data, severity }));
  }

  selectStation(stationId: number) {
    this.complaintModel.update(data => ({ ...data, station_id: stationId }));
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    const data = this.complaintModel();
    
    // Manual validation
    if (!data.title || data.title.length < 5) {
      this.errorMessage.set('Title must be at least 5 characters');
      return;
    }
    
    if (!data.description || data.description.length < 10) {
      this.errorMessage.set('Description must be at least 10 characters');
      return;
    }
    
    if (!data.type) {
      this.errorMessage.set('Please select a complaint type');
      return;
    }

    // If manager has multiple stations, require station selection
    if (this.managerStations().length > 1 && !data.station_id) {
      this.errorMessage.set('Please select a station');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.complaintsService.createComplaint({
        title: data.title,
        description: data.description,
        type: data.type as ComplaintType,
        severity: data.severity,
        station_id: data.station_id
      });
      this.router.navigate(['/manager/complaints']);
    } catch (error: unknown) {
      if (typeof error === 'string') {
        this.errorMessage.set(error);
      } else if (error instanceof Error) {
        this.errorMessage.set(error.message);
      } else {
        this.errorMessage.set('Failed to create complaint. You may not be assigned to a station.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/manager/complaints']);
  }
}