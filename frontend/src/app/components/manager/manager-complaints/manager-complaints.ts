import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { COMPLAINT_TYPES, COMPLAINT_STATUSES, SEVERITY_LEVELS } from '../../../models/complaint';
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
}