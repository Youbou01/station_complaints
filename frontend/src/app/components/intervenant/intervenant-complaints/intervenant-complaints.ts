import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Complaint, COMPLAINT_TYPES, COMPLAINT_STATUSES, SEVERITY_LEVELS, ComplaintStatus } from '../../../models/complaint';
import { StationsService } from '../../../services/stations-service';
import { ComplaintsService } from '../../../services/complaints-service';

@Component({
  selector: 'app-intervenant-complaints',
  imports: [DatePipe],
  templateUrl: './intervenant-complaints.html',
  styleUrl: './intervenant-complaints.css',
})
export class IntervenantComplaints implements OnInit {
  complaintsService = inject(ComplaintsService);
  stationsService = inject(StationsService);

  types = COMPLAINT_TYPES;
  statuses = COMPLAINT_STATUSES;
  severityLevels = SEVERITY_LEVELS;

  selectedComplaint = signal<Complaint | null>(null);
  selectedStatus = signal<ComplaintStatus | null>(null);
  resolutionNotes = signal('');
  showModal = signal(false);
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

  openModal(complaint: Complaint) {
    this.selectedComplaint.set(complaint);
    this.showModal.set(true);
  }

  closeModal() {
    this.selectedComplaint.set(null);
    this.selectedStatus.set(null);
    this.resolutionNotes.set('');
    this.showModal.set(false);
  }

  selectStatus(status: ComplaintStatus) {
    this.selectedStatus.set(status);
  }

  async updateStatus() {
    const complaint = this.selectedComplaint();
    const status = this.selectedStatus();
    
    if (!complaint || !status) return;

    try {
      await this.complaintsService.updateStatus(complaint.id, status, this.resolutionNotes() || undefined);
      this.closeModal();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  async quickStart(complaint: Complaint) {
    try {
      await this.complaintsService.updateStatus(complaint.id, 'in_progress');
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}