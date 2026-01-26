import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Complaint, COMPLAINT_STATUSES, COMPLAINT_TYPES, SEVERITY_LEVELS } from '../../../models/complaint';
import { ComplaintsService } from '../../../services/complaints-service';
import { StationsService } from '../../../services/stations-service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-complaints-list',
  imports: [RouterLink,DatePipe],
  templateUrl: './complaints-list.html',
  styleUrl: './complaints-list.css',
})
export class ComplaintsList implements OnInit {
  complaintsService = inject(ComplaintsService);
  stationsService = inject(StationsService);

  statuses = COMPLAINT_STATUSES;
  types = COMPLAINT_TYPES;
  severityLevels = SEVERITY_LEVELS;

  showDeleteModal = signal(false);
  complaintToDelete = signal<Complaint | null>(null);
  errorMessage = signal('');

  ngOnInit() {
    this.complaintsService.loadComplaints();
    this.stationsService.loadStations();
  }

  getStationName(stationId: number): string {
    const station = this.stationsService.stations().find(s => s.id === stationId);
    return station?.name || 'Unknown';
  }

  getTypeLabel(type: string): string {
    return this.types.find(t => t.value === type)?.label || type;
  }

  getStatusLabel(status: string): string {
    return this.statuses.find(s => s.value === status)?.label || status;
  }

  getSeverityLabel(severity: number): string {
    return this.severityLevels.find(s => s.value === severity)?.label || String(severity);
  }

  confirmDelete(complaint: Complaint) {
    this.complaintToDelete.set(complaint);
    this.showDeleteModal.set(true);
  }

  cancelDelete() {
    this.complaintToDelete.set(null);
    this.showDeleteModal.set(false);
  }

  async deleteComplaint() {
    const complaint = this.complaintToDelete();
    if (!complaint) return;

    try {
      await this.complaintsService.deleteComplaint(complaint.id);
      this.cancelDelete();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}