import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth-service';
import { ComplaintsService } from '../../../services/complaints-service';
import { Station } from '../../../services/stations-service';


@Component({
  selector: 'app-manager-dashboard',
  imports: [RouterLink],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
})
export class ManagerDashboard implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);
  complaintsService = inject(ComplaintsService);

  stations = signal<Station[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // Computed property for displaying station info
  stationInfo = computed(() => {
    const stationsList = this.stations();
    if (stationsList.length === 0) return 'No station assigned';
    if (stationsList.length === 1) return stationsList[0].name;
    return `${stationsList.length} stations`;
  });

  ngOnInit() {
    this.loadStations();
    this.complaintsService.loadComplaints();
  }

  loadStations() {
    this.http.get<Station[]>('http://localhost:8000/stations').subscribe({
      next: (stations) => {
        const userId = this.authService.currentUser()?.id;
        const myStations = stations.filter(s => s.manager_id === userId);
        this.stations.set(myStations);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load stations');
        this.isLoading.set(false);
      }
    });
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
}