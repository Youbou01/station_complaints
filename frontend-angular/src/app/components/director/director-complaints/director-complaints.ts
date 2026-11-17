import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ComplaintsService } from '../../../services/complaints-service';
import { StationsService } from '../../../services/stations-service';
import { HttpClient } from '@angular/common/http';
import { Complaint, COMPLAINT_TYPES, COMPLAINT_STATUSES, SEVERITY_LEVELS } from '../../../models/complaint';

@Component({
  selector: 'app-director-complaints',
  imports: [DatePipe],
  templateUrl: './director-complaints.html',
  styleUrl: './director-complaints.css',
})
export class DirectorComplaints implements OnInit {
  private http = inject(HttpClient);
  complaintsService = inject(ComplaintsService);
  stationsService = inject(StationsService);

  types = COMPLAINT_TYPES;
  statuses = COMPLAINT_STATUSES;
  severityLevels = SEVERITY_LEVELS;

  selectedComplaint = signal<Complaint | null>(null);
  ratingScore = signal<number>(3);
  showRatingModal = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  ratings = signal<Map<number, any>>(new Map());

  ngOnInit() {
    this.complaintsService.loadComplaints();
    this.stationsService.loadStations();
    this.loadRatings();
  }

  async loadRatings() {
    try {
      const data = await this.http.get<any[]>('http://localhost:8000/ratings').toPromise();
      const ratingsMap = new Map();
      data?.forEach((rating: any) => {
        ratingsMap.set(rating.complaint_id, rating);
      });
      this.ratings.set(ratingsMap);
    } catch (error) {
      console.error('Failed to load ratings');
    }
  }

  getComplaintRating(complaintId: number): any | null {
    return this.ratings().get(complaintId) || null;
  }

  calculateResolutionTime(complaint: Complaint): string {
    if (!complaint.assigned_at || !complaint.resolved_at) {
      return 'N/A';
    }
    
    const assigned = new Date(complaint.assigned_at).getTime();
    const resolved = new Date(complaint.resolved_at).getTime();
    const diffMs = resolved - assigned;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    
    if (diffDays > 0) {
      return `${diffDays}d ${remainingHours}h`;
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMinutes}m`;
    }
  }

  getStationName(stationId: number): string {
    const station = this.stationsService.stations().find(s => s.id === stationId);
    return station?.name || 'Unknown';
  }

  getTypeLabel(type: string): string {
    return this.types.find(t => t.value === type)?.label || type;
  }

  getStatusLabel(status: string): string {
    return this.statuses.find(s => s.value === status)?.label || status;
  }

  openRatingModal(complaint: Complaint) {
    this.selectedComplaint.set(complaint);
    this.ratingScore.set(3);
    this.showRatingModal.set(true);
  }

  closeRatingModal() {
    this.selectedComplaint.set(null);
    this.showRatingModal.set(false);
  }

  setRating(score: number) {
    this.ratingScore.set(score);
  }

  submitRating() {
    const complaint = this.selectedComplaint();
    if (!complaint) return;

    this.http.post('http://localhost:8000/ratings', {
      complaint_id: complaint.id,
      rating_score: this.ratingScore()
    }).subscribe({
      next: () => {
        this.successMessage.set('Rating submitted successfully');
        this.closeRatingModal();
        this.loadRatings(); // Reload ratings to update the UI
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.detail || 'Failed to submit rating');
      }
    });
  }
}