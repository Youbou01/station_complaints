import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Complaint, COMPLAINT_TYPES, COMPLAINT_STATUSES, SEVERITY_LEVELS } from '../../../models/complaint';
import { ComplaintsService } from '../../../services/complaints-service';

@Component({
  selector: 'app-manager-complaints',
  imports: [RouterLink, DatePipe],
  templateUrl: './manager-complaints.html',
  styleUrl: './manager-complaints.css',
})
export class ManagerComplaints implements OnInit {
  complaintsService = inject(ComplaintsService);

  types = COMPLAINT_TYPES;
  statuses = COMPLAINT_STATUSES;
  severityLevels = SEVERITY_LEVELS;

  showFeedbackModal = signal(false);
  selectedComplaint = signal<Complaint | null>(null);
  feedbackText = signal('');
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit() {
    this.complaintsService.loadComplaints();
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

  openFeedbackModal(complaint: Complaint) {
    this.selectedComplaint.set(complaint);
    this.feedbackText.set('');
    this.showFeedbackModal.set(true);
  }

  closeFeedbackModal() {
    this.selectedComplaint.set(null);
    this.feedbackText.set('');
    this.showFeedbackModal.set(false);
  }

  async submitFeedback() {
    const complaint = this.selectedComplaint();
    const feedback = this.feedbackText();
    
    if (!complaint || !feedback || feedback.length < 5) {
      this.errorMessage.set('Feedback must be at least 5 characters');
      return;
    }

    try {
      await this.complaintsService.addFeedback(complaint.id, feedback);
      this.successMessage.set('Feedback added successfully');
      this.closeFeedbackModal();
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set(error as string);
    }
  }
}