import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
// Response types from backend
interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserResponse {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

// Request types
interface RegisterRequest {
  email: string;
  password: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = 'http://localhost:8000';

  currentUser = signal<UserResponse | null>(null);
  isLoggedIn = signal<boolean>(false);
  isInitialized = signal<boolean>(false); // Track if auth check is complete

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await this.fetchCurrentUser();
        this.isLoggedIn.set(true);
      } catch {
        this.removeToken();
        this.isLoggedIn.set(false);
      }
    }
    
    this.isInitialized.set(true);
  }

  private saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private removeToken(): void {
    localStorage.removeItem('access_token');
  }

  login(email: string, password: string): Promise<UserResponse> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    return new Promise((resolve, reject) => {
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, formData).subscribe({
        next: async (response) => {
          this.saveToken(response.access_token);
          this.isLoggedIn.set(true);
          
          try {
            const user = await this.fetchCurrentUser();
            resolve(user);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error.error?.detail || 'Login failed');
        }
      });
    });
  }

  register(email: string, password: string, role: string): Promise<boolean> {
    const body: RegisterRequest = { email, password, role };

    return new Promise((resolve, reject) => {
      this.http.post<UserResponse>(`${this.apiUrl}/register`, body).subscribe({
        next: () => resolve(true),
        error: (error) => reject(error.error?.detail || 'Registration failed')
      });
    });
  }

  fetchCurrentUser(): Promise<UserResponse> {
    return new Promise((resolve, reject) => {
      this.http.get<UserResponse>(`${this.apiUrl}/me`).subscribe({
        next: (user) => {
          this.currentUser.set(user);
          resolve(user);
        },
        error: (error) => {
          reject(error.error?.detail || 'Failed to fetch user');
        }
      });
    });
  }

  logout(): void {
    this.removeToken();
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/auth/login']);
  }
}
// signUp(email: string, password: string, role: string): Promise<boolean> {
  //   const body: RegisterRequest = { email, password, role };

  //   return new Promise((resolve, reject) => {
  //     this.http.post<UserResponse>(`${this.apiUrl}/users`, body)
  //       .subscribe({
  //         next: () => {
  //           resolve(true);
  //         },
  //         error: (error) => {
  //           console.error('Sign up failed:', error);
  //           reject(error.error?.detail || 'Sign up failed');
  //         }
  //       });
  //   });
  // }