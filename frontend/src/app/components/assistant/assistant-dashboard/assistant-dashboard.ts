import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StationsService } from '../../../services/stations-service';
import { ComplaintsService } from '../../../services/complaints-service';


@Component({
  selector: 'app-assistant-dashboard',
  imports: [RouterLink],
  templateUrl: './assistant-dashboard.html',
  styleUrl: './assistant-dashboard.css',
})
export class AssistantDashboard implements OnInit {
  complaintsService = inject(ComplaintsService);
  stationsService = inject(StationsService);

  ngOnInit() {
    this.complaintsService.loadComplaints();
    this.stationsService.loadStations();
  }

  get totalComplaints() {
    return this.complaintsService.complaints().length;
  }

  get openComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'open').length;
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

  get totalStations() {
    return this.stationsService.stations().length;
  }

  get recentComplaints() {
    return this.complaintsService.complaints().slice(0, 5);
  }
}