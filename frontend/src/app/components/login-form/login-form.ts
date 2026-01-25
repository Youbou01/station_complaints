import { Component, effect, inject, signal } from '@angular/core';
import { LoginData, loginInitialData, loginSchema } from '../../models/auth';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
@Component({
  selector: 'app-login-form',
  imports: [FormField,RouterLink],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
})
export class LoginForm {
  private router = inject(Router);

  // Form model and schema
  loginModel = signal<LoginData>(loginInitialData);
  loginForm = form(this.loginModel, loginSchema);

  // UI State
  showPassword = signal(false);
  isLoading = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (this.loginForm().invalid()) return;

    this.isLoading.set(true);

    // TODO: Call auth service
    console.log('Login attempt:', this.loginModel());
    setTimeout(() => {
      this.isLoading.set(false);
      // TODO: Navigate to dashboard after real login
    }, 1500);
  }
}
