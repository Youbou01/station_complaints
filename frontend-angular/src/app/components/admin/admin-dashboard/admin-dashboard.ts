import { Component, inject, OnInit } from '@angular/core';
import { StationsService } from '../../../services/stations-service';
import { UsersService } from '../../../services/users-service';
import { ComplaintsService } from '../../../services/complaints-service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  stationsService = inject(StationsService);
  usersService = inject(UsersService);
  complaintsService = inject(ComplaintsService);

  ngOnInit() {
    this.stationsService.loadStations();
    this.usersService.loadUsers();
    this.complaintsService.loadComplaints();
  }

  get totalStations() {
    return this.stationsService.stations().length;
  }

  get activeStations() {
    return this.stationsService.stations().filter(s => s.is_active).length;
  }

  get totalUsers() {
    return this.usersService.users().length;
  }

  get pendingUsers() {
    return this.usersService.users().filter(u => !u.is_active).length;
  }

  get totalComplaints() {
    return this.complaintsService.complaints().length;
  }

  get openComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'open').length;
  }

  get inProgressComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'in_progress' || c.status === 'assigned').length;
  }

  get resolvedComplaints() {
    return this.complaintsService.complaints().filter(c => c.status === 'resolved').length;
  }
}