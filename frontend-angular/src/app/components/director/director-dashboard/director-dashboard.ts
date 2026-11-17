import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComplaintsService } from '../../../services/complaints-service';
import { StationsService } from '../../../services/stations-service';

@Component({
  selector: 'app-director-dashboard',
  imports: [RouterLink],
  templateUrl: './director-dashboard.html',
  styleUrl: './director-dashboard.css',
})
export class DirectorDashboard implements OnInit {
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

  get inProgressComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'assigned' || c.status === 'in_progress').length;
  }

  get resolvedComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'resolved').length;
  }

  get totalStations() {
    return this.stationsService.stations().length;
  }
}