import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Station {
  id: number;
  name: string;
  code: string;
  address: string | null;
  governorate: string;
  is_active: boolean;
  manager_id: number | null;
  assistant_id: number | null;
}

export interface StationCreate {
  name: string;
  code: string;
  address?: string;
  governorate: string;
}

export interface StationUpdate {
  name?: string;
  address?: string;
  governorate?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StationsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000';

  stations = signal<Station[]>([]);
  isLoading = signal<boolean>(false);

  loadStations(governorate?: string, isActive?: boolean): void {
    this.isLoading.set(true);

    let url = `${this.apiUrl}/stations`;
    const params: string[] = [];

    if (governorate) params.push(`governorate=${governorate}`);
    if (isActive !== undefined) params.push(`is_active=${isActive}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<Station[]>(url).subscribe({
      next: (data) => {
        this.stations.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load stations:', error);
        this.isLoading.set(false);
      }
    });
  }

  getStation(id: number): Promise<Station> {
    return new Promise((resolve, reject) => {
      this.http.get<Station>(`${this.apiUrl}/stations/${id}`).subscribe({
        next: (station) => resolve(station),
        error: (error) => reject(error.error?.detail || 'Failed to load station')
      });
    });
  }

  createStation(station: StationCreate): Promise<Station> {
    return new Promise((resolve, reject) => {
      this.http.post<Station>(`${this.apiUrl}/stations`, station).subscribe({
        next: (created) => {
          this.loadStations(); // Refresh list
          resolve(created);
        },
        error: (error) => reject(error.error?.detail || 'Failed to create station')
      });
    });
  }

  updateStation(id: number, station: StationUpdate): Promise<Station> {
    return new Promise((resolve, reject) => {
      this.http.put<Station>(`${this.apiUrl}/stations/${id}`, station).subscribe({
        next: (updated) => {
          this.loadStations(); // Refresh list
          resolve(updated);
        },
        error: (error) => reject(error.error?.detail || 'Failed to update station')
      });
    });
  }

  deleteStation(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/stations/${id}`).subscribe({
        next: () => {
          this.loadStations(); // Refresh list
          resolve();
        },
        error: (error) => reject(error.error?.detail || 'Failed to delete station')
      });
    });
  }

  assignManager(stationId: number, managerId: number | null): Promise<Station> {
    return new Promise((resolve, reject) => {
      this.http.put<Station>(`${this.apiUrl}/stations/${stationId}/manager`, { manager_id: managerId }).subscribe({
        next: (updated) => {
          this.loadStations(); // Refresh list
          resolve(updated);
        },
        error: (error) => reject(error.error?.detail || 'Failed to assign manager')
      });
    });
  }
}