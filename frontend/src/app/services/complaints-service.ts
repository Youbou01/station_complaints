import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Complaint, ComplaintDetail, ComplaintType, ComplaintStatus } from '../models/complaint';

export interface ComplaintCreate {
  title: string;
  description: string;
  type: ComplaintType;
  severity: number;
}

export interface ComplaintUpdate {
  title?: string;
  description?: string;
  type?: ComplaintType;
  severity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ComplaintsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000';

  complaints = signal<Complaint[]>([]);
  isLoading = signal<boolean>(false);

  loadComplaints(filters?: {
    status?: ComplaintStatus;
    type?: ComplaintType;
    station_id?: number;
  }): void {
    this.isLoading.set(true);

    let url = `${this.apiUrl}/complaints`;
    const params: string[] = [];

    if (filters?.status) params.push(`status_filter=${filters.status}`);
    if (filters?.type) params.push(`type_filter=${filters.type}`);
    if (filters?.station_id) params.push(`station_id=${filters.station_id}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<Complaint[]>(url).subscribe({
      next: (data) => {
        this.complaints.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load complaints:', error);
        this.isLoading.set(false);
      }
    });
  }

  getComplaint(id: number): Promise<ComplaintDetail> {
    return new Promise((resolve, reject) => {
      this.http.get<ComplaintDetail>(`${this.apiUrl}/complaints/${id}`).subscribe({
        next: (complaint) => resolve(complaint),
        error: (error) => reject(error.error?.detail || 'Failed to load complaint')
      });
    });
  }

  createComplaint(complaint: ComplaintCreate): Promise<Complaint> {
    return new Promise((resolve, reject) => {
      this.http.post<Complaint>(`${this.apiUrl}/complaints`, complaint).subscribe({
        next: (created) => {
          this.loadComplaints();
          resolve(created);
        },
        error: (error) => {
          const message = error.error?.detail || error.message || 'Failed to create complaint';
          reject(message);
        }
      });
    });
  }

  updateComplaint(id: number, complaint: ComplaintUpdate): Promise<Complaint> {
    return new Promise((resolve, reject) => {
      this.http.put<Complaint>(`${this.apiUrl}/complaints/${id}`, complaint).subscribe({
        next: (updated) => {
          this.loadComplaints();
          resolve(updated);
        },
        error: (error) => reject(error.error?.detail || 'Failed to update complaint')
      });
    });
  }

  deleteComplaint(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/complaints/${id}`).subscribe({
        next: () => {
          this.loadComplaints();
          resolve();
        },
        error: (error) => reject(error.error?.detail || 'Failed to delete complaint')
      });
    });
  }

  assignComplaint(complaintId: number, intervenantId: number): Promise<Complaint> {
    return new Promise((resolve, reject) => {
      this.http.put<Complaint>(`${this.apiUrl}/complaints/${complaintId}/assign`, {
        assigned_to_id: intervenantId
      }).subscribe({
        next: (updated) => {
          this.loadComplaints();
          resolve(updated);
        },
        error: (error) => reject(error.error?.detail || 'Failed to assign complaint')
      });
    });
  }

  updateStatus(complaintId: number, status: ComplaintStatus, resolutionNotes?: string): Promise<Complaint> {
    return new Promise((resolve, reject) => {
      this.http.put<Complaint>(`${this.apiUrl}/complaints/${complaintId}/status`, {
        status,
        resolution_notes: resolutionNotes
      }).subscribe({
        next: (updated) => {
          this.loadComplaints();
          resolve(updated);
        },
        error: (error) => reject(error.error?.detail || 'Failed to update status')
      });
    });
  }

  getIntervenants(): Promise<{ id: number; email: string; role: string; is_active: boolean }[]> {
    return new Promise((resolve, reject) => {
      this.http.get<any[]>(`${this.apiUrl}/intervenants`).subscribe({
        next: (data) => resolve(data),
        error: (error) => reject(error.error?.detail || 'Failed to load intervenants')
      });
    });
  }

  sendComplaint(complaintId: number): Promise<Complaint> {
    return new Promise((resolve, reject) => {
      this.http.post<Complaint>(`${this.apiUrl}/complaints/${complaintId}/send`, {}).subscribe({
        next: (updated) => {
          this.loadComplaints();
          resolve(updated);
        },
        error: (error) => reject(error.error?.detail || 'Failed to send complaint')
      });
    });
  }
}