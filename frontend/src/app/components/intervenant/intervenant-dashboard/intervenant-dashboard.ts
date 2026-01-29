import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComplaintsService } from '../../../services/complaints-service';

@Component({
  selector: 'app-intervenant-dashboard',
  imports: [RouterLink],
  templateUrl: './intervenant-dashboard.html',
  styleUrl: './intervenant-dashboard.css',
})
export class IntervenantDashboard implements OnInit {
  complaintsService = inject(ComplaintsService);

  ngOnInit() {
    this.complaintsService.loadComplaints();
  }

  get totalAssigned() {
    return this.complaintsService.complaints().length;
  }

  get assignedComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'assigned').length;
  }

  get inProgressComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'in_progress').length;
  }

  get resolvedComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'resolved').length;
  }

  get pendingComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'assigned' || c.status === 'in_progress');
  }
}