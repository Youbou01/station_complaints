import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Complaint, COMPLAINT_TYPES, COMPLAINT_STATUSES, SEVERITY_LEVELS, ComplaintStatus } from '../../../models/complaint';
import { StationsService } from '../../../services/stations-service';
import { ComplaintsService } from '../../../services/complaints-service';

@Component({
  selector: 'app-assistant-complaints',
  imports: [DatePipe],
  templateUrl: './assistant-complaints.html',
  styleUrl: './assistant-complaints.css',
})
export class AssistantComplaints implements OnInit {
  complaintsService = inject(ComplaintsService);
  stationsService = inject(StationsService);

  types = COMPLAINT_TYPES;
  statuses = COMPLAINT_STATUSES;
  severityLevels = SEVERITY_LEVELS;

  selectedComplaint = signal<Complaint | null>(null);
  intervenants = signal<{ id: number; email: string }[]>([]);
  selectedIntervenantId = signal<number | null>(null);
  
  showAssignModal = signal(false);
  showSendModal = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  ngOnInit() {
    this.complaintsService.loadComplaints();
    this.stationsService.loadStations();
    this.loadIntervenants();
  }

  async loadIntervenants() {
    try {
      const data = await this.complaintsService.getIntervenants();
      this.intervenants.set(data);
    } catch (error) {
      console.error('Failed to load intervenants');
    }
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

  openSendModal(complaint: Complaint) {
    this.selectedComplaint.set(complaint);
    this.showSendModal.set(true);
  }

  closeSendModal() {
    this.selectedComplaint.set(null);
    this.showSendModal.set(false);
  }

  async sendComplaint() {
    const complaint = this.selectedComplaint();
    if (!complaint) return;

    try {
      await this.complaintsService.sendComplaint(complaint.id);
      this.successMessage.set('Complaint sent successfully to intervenant');
      this.closeSendModal();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  openAssignModal(complaint: Complaint) {
    this.selectedComplaint.set(complaint);
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.selectedComplaint.set(null);
    this.selectedIntervenantId.set(null);
    this.showAssignModal.set(false);
  }

  selectIntervenant(id: number) {
    this.selectedIntervenantId.set(id);
  }

  async assignComplaint() {
    const complaint = this.selectedComplaint();
    const intervenantId = this.selectedIntervenantId();
    
    if (!complaint || !intervenantId) return;

    try {
      await this.complaintsService.assignComplaint(complaint.id, intervenantId);
      this.successMessage.set('Complaint assigned successfully');
      this.closeAssignModal();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}