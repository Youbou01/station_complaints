import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComplaintsService } from '../../../services/complaints-service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-intervenant-dashboard',
  imports: [RouterLink],
  templateUrl: './intervenant-dashboard.html',
  styleUrl: './intervenant-dashboard.css',
})
export class IntervenantDashboard implements OnInit {
  private http = inject(HttpClient);
  complaintsService = inject(ComplaintsService);
  ratings = signal<any[]>([]);
  averageRating = signal<number>(0);

  ngOnInit() {
    this.complaintsService.loadComplaints();
    this.loadMyRatings();
  }

  async loadMyRatings() {
  try {
    // Use the new endpoint for intervenants
    const data = await this.http.get<any[]>('http://localhost:8000/my-ratings').toPromise();
    this.ratings.set(data || []);
    
    // Calculate average rating
    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating_score, 0) / data.length;
      this.averageRating.set(Math.round(avg * 10) / 10);
    }
  } catch (error) {
    console.error('Failed to load ratings');
  }
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