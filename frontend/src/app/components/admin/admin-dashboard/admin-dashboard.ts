import { Component, inject, OnInit } from '@angular/core';
import { StationsService } from '../../../services/stations-service';
import { UsersService } from '../../../services/users-service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  stationsService = inject(StationsService);
  usersService = inject(UsersService);

  ngOnInit() {
    this.stationsService.loadStations();
    this.usersService.loadUsers();
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
}
