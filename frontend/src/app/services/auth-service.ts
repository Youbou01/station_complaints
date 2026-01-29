import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface UserResponse {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

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
  isInitialized = signal<boolean>(false);

  async initialize(): Promise<void> {
    const token = localStorage.getItem('access_token');

    if (!token) {
      this.isInitialized.set(true);
      return;
    }

    try {
      const user = await firstValueFrom(
        this.http.get<UserResponse>(`${this.apiUrl}/me`)
      );
      this.currentUser.set(user);
      this.isLoggedIn.set(true);
    } catch {
      localStorage.removeItem('access_token');
      this.currentUser.set(null);
      this.isLoggedIn.set(false);
    }
    
    this.isInitialized.set(true);
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

  async login(email: string, password: string): Promise<UserResponse> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/login`, formData)
      );
      
      this.saveToken(response.access_token);
      
      try {
        const user = await firstValueFrom(
          this.http.get<UserResponse>(`${this.apiUrl}/me`)
        );
        
        this.currentUser.set(user);
        this.isLoggedIn.set(true);
        
        return user;
      } catch (userError: any) {
        // If fetching user fails, remove the saved token
        this.removeToken();
        throw userError.error?.detail || userError.message || 'Failed to fetch user';
      }
    } catch (loginError: any) {
      throw loginError.error?.detail || loginError.message || 'Login failed';
    }
  }

  async register(email: string, password: string, role: string): Promise<boolean> {
    const body: RegisterRequest = { email, password, role };
    try {
      await firstValueFrom(
        this.http.post<UserResponse>(`${this.apiUrl}/register`, body)
      );
      return true;
    } catch (error: any) {
      throw error.error?.detail || error.message || 'Registration failed';
    }
  }

  logout(): void {
    this.removeToken();
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/auth/login']);
  }
}