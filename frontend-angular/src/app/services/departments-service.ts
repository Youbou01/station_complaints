import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ComplaintType } from '../models/complaint';

export interface Department {
  id: number;
  name: string;
  complaint_type: string;
  intervenant_id: number | null;
  created_at: string;
}

export interface DepartmentCreate {
  name: string;
  complaint_type: ComplaintType;
  intervenant_id?: number;
}

export interface DepartmentUpdate {
  name?: string;
  intervenant_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000';

  departments = signal<Department[]>([]);
  isLoading = signal<boolean>(false);

  loadDepartments(): void {
    this.isLoading.set(true);

    this.http.get<Department[]>(`${this.apiUrl}/departments`).subscribe({
      next: (data) => {
        this.departments.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load departments:', error);
        this.isLoading.set(false);
      }
    });
  }

  createDepartment(department: DepartmentCreate): Promise<Department> {
    return new Promise((resolve, reject) => {
      this.http.post<Department>(`${this.apiUrl}/departments`, department).subscribe({
        next: (created) => {
          this.loadDepartments();
          resolve(created);
        },
        error: (error) => {
          const message = error.error?.detail || 'Failed to create department';
          reject(message);
        }
      });
    });
  }

  updateDepartment(id: number, update: DepartmentUpdate): Promise<Department> {
    return new Promise((resolve, reject) => {
      this.http.put<Department>(`${this.apiUrl}/departments/${id}`, update).subscribe({
        next: (updated) => {
          this.loadDepartments();
          resolve(updated);
        },
        error: (error) => {
          const message = error.error?.detail || 'Failed to update department';
          reject(message);
        }
      });
    });
  }

  deleteDepartment(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/departments/${id}`).subscribe({
        next: () => {
          this.loadDepartments();
          resolve();
        },
        error: (error) => {
          const message = error.error?.detail || 'Failed to delete department';
          reject(message);
        }
      });
    });
  }
}