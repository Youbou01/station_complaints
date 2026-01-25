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

  // Current user state
  currentUser = signal<UserResponse | null>(null);
  isLoggedIn = signal<boolean>(false);

  constructor() {
    // Check if user is already logged in on app start
    this.checkToken();
  }
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
  private saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }
  private removeToken(): void {
    localStorage.removeItem('access_token');
  }
  private checkToken(): void {
    const token = this.getToken();
    if (token) {
      this.isLoggedIn.set(true);
      this.fetchCurrentUser();
    }
  }

  // ============== API CALLS ==============

  login(email: string, password: string): Promise<boolean> {
    // FastAPI expects form data for OAuth2, not JSON
    const formData = new FormData();
    formData.append('username', email); // FastAPI OAuth2 uses 'username' field
    formData.append('password', password);

    return new Promise((resolve, reject) => {
      this.http.post<LoginResponse>(`${this.apiUrl}/login`, formData)
        .subscribe({
          next: (response) => {
            this.saveToken(response.access_token);
            this.isLoggedIn.set(true);
            this.fetchCurrentUser();
            resolve(true);
          },
          error: (error) => {
            console.error('Login failed:', error);
            reject(error.error?.detail || 'Login failed');
          }
        });
    });
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
  register(email: string, password: string, role: string): Promise<boolean> {
    const body: RegisterRequest = { email, password, role };

    return new Promise((resolve, reject) => {
      this.http.post<UserResponse>(`${this.apiUrl}/register`, body)
        .subscribe({
          next: () => {
            resolve(true);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            reject(error.error?.detail || 'Registration failed');
          }
        });
    });
  }
  fetchCurrentUser(): void {
    this.http.get<UserResponse>(`${this.apiUrl}/me`)
      .subscribe({
        next: (user) => {
          this.currentUser.set(user);
        },
        error: (error) => {
          console.error('Failed to fetch user:', error);
          this.logout();
        }
      });
  }

  logout(): void {
    this.removeToken();
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/auth/login']);
  }
}
