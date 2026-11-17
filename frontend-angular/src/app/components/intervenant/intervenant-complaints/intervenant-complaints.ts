import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

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
  private http = inject(HttpClient);

  types = COMPLAINT_TYPES;
  statuses = COMPLAINT_STATUSES;
  severityLevels = SEVERITY_LEVELS;

  selectedComplaint = signal<Complaint | null>(null);
  selectedStatus = signal<ComplaintStatus | null>(null);
  resolutionNotes = signal('');
  showModal = signal(false);
  showOnHoldModal = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  ratings = signal<Map<number, any>>(new Map());

  ngOnInit() {
    this.complaintsService.loadComplaints();
    this.stationsService.loadStations();
    this.loadRatings();
  }

  async loadRatings() {
  try {
    
    const data = await this.http.get<any[]>('http://localhost:8000/my-ratings').toPromise();
    const ratingsMap = new Map();
    data?.forEach((rating: any) => {
      ratingsMap.set(rating.complaint_id, rating);
    });
    this.ratings.set(ratingsMap);
  } catch (error) {
    console.error('Failed to load ratings');
  }
}

  getComplaintRating(complaintId: number): any | null {
    return this.ratings().get(complaintId) || null;
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

  openOnHoldModal(complaint: Complaint) {
    this.selectedComplaint.set(complaint);
    this.showOnHoldModal.set(true);
  }

  closeOnHoldModal() {
    this.selectedComplaint.set(null);
    this.resolutionNotes.set('');
    this.showOnHoldModal.set(false);
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
      this.successMessage.set('Status updated successfully');
      this.closeModal();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  async handleComplaint(complaint: Complaint) {
    try {
      await this.complaintsService.updateStatus(complaint.id, 'in_progress');
      this.successMessage.set('Complaint marked as in progress');
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  async putOnHold() {
    const complaint = this.selectedComplaint();
    if (!complaint) return;

    try {
      await this.complaintsService.updateStatus(complaint.id, 'on_hold', this.resolutionNotes() || undefined);
      this.successMessage.set('Complaint put on hold');
      this.closeOnHoldModal();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}