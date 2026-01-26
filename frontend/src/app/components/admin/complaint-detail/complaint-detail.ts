import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';

import { 
  ComplaintDetail, 
  COMPLAINT_STATUSES, 
  COMPLAINT_TYPES, 
  SEVERITY_LEVELS,
  ComplaintStatus 
} from '../../../models/complaint';
import { ComplaintsService } from '../../../services/complaints-service';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-complaint-detail',
  imports: [DatePipe],
  templateUrl: './complaint-detail.html',
  styleUrl: './complaint-detail.css',
})
export class ComplaintDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private complaintsService = inject(ComplaintsService);
  authService = inject(AuthService);

  complaint = signal<ComplaintDetail | null>(null);
  intervenants = signal<{ id: number; email: string }[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  
  showAssignModal = signal(false);
  showStatusModal = signal(false);
  selectedIntervenantId = signal<number | null>(null);
  selectedStatus = signal<ComplaintStatus | null>(null);
  resolutionNotes = signal('');

  statuses = COMPLAINT_STATUSES;
  types = COMPLAINT_TYPES;
  severityLevels = SEVERITY_LEVELS;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadComplaint(Number(id));
      this.loadIntervenants();
    }
  }

  async loadComplaint(id: number) {
    try {
      const complaint = await this.complaintsService.getComplaint(id);
      this.complaint.set(complaint);
    } catch (error) {
      this.errorMessage.set(error as string);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadIntervenants() {
    try {
      const data = await this.complaintsService.getIntervenants();
      this.intervenants.set(data);
    } catch (error) {
      console.error('Failed to load intervenants:', error);
    }
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

  openAssignModal() {
    this.showAssignModal.set(true);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
    this.selectedIntervenantId.set(null);
  }

  selectIntervenant(id: number) {
    this.selectedIntervenantId.set(id);
  }

  async assignComplaint() {
    const complaintId = this.complaint()?.id;
    const intervenantId = this.selectedIntervenantId();
    
    if (!complaintId || !intervenantId) return;

    try {
      await this.complaintsService.assignComplaint(complaintId, intervenantId);
      await this.loadComplaint(complaintId);
      this.closeAssignModal();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  openStatusModal() {
    this.showStatusModal.set(true);
  }

  closeStatusModal() {
    this.showStatusModal.set(false);
    this.selectedStatus.set(null);
    this.resolutionNotes.set('');
  }

  selectStatus(status: ComplaintStatus) {
    this.selectedStatus.set(status);
  }

  async updateStatus() {
    const complaintId = this.complaint()?.id;
    const status = this.selectedStatus();
    
    if (!complaintId || !status) return;

    try {
      await this.complaintsService.updateStatus(complaintId, status, this.resolutionNotes() || undefined);
      await this.loadComplaint(complaintId);
      this.closeStatusModal();
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }

  goBack() {
    this.router.navigate(['/admin/complaints']);
  }
}