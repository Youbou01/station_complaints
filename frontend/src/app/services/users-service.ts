import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000';

  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);

  loadUsers(isActive?: boolean): void {
    this.isLoading.set(true);

    let url = `${this.apiUrl}/users`;
    if (isActive !== undefined) {
      url += `?is_active=${isActive}`;
    }

    this.http.get<User[]>(url).subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.isLoading.set(false);
      }
    });
  }

  getManagers(): User[] {
    return this.users().filter(u => u.role === 'manager' && u.is_active);
  }

  activateUser(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      this.http.put<User>(`${this.apiUrl}/users/${userId}/activate`, {}).subscribe({
        next: (user) => {
          this.loadUsers();
          resolve(user);
        },
        error: (error) => reject(error.error?.detail || 'Failed to activate user')
      });
    });
  }

  deactivateUser(userId: number): Promise<User> {
    return new Promise((resolve, reject) => {
      this.http.put<User>(`${this.apiUrl}/users/${userId}/deactivate`, {}).subscribe({
        next: (user) => {
          this.loadUsers();
          resolve(user);
        },
        error: (error) => reject(error.error?.detail || 'Failed to deactivate user')
      });
    });
  }

  deleteUser(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/users/${userId}`).subscribe({
        next: () => {
          this.loadUsers();
          resolve();
        },
        error: (error) => reject(error.error?.detail || 'Failed to delete user')
      });
    });
  }
}