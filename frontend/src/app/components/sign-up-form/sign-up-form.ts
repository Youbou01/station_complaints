import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { SignUpData, signUpInitialData, signUpSchema, Role, ROLE_OPTIONS } from '../../models/auth';
import { AuthService } from '../../services/auth-service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-sign-up-form',
  imports: [FormField, RouterLink,FormsModule,ReactiveFormsModule],
  templateUrl: './sign-up-form.html',
  styleUrl: './sign-up-form.css',
})
export class SignUpForm {
  private router = inject(Router);
  private authService:AuthService=inject(AuthService);

  // Form model and schema
  signUpModel = signal<SignUpData>(signUpInitialData);
  signUpForm = form(this.signUpModel, signUpSchema);

  // UI State
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  roleOptions = ROLE_OPTIONS;
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Password strength calculation
  passwordStrength = computed(() => {
    const password = this.signUpModel().password;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[0-9]/.test(password)) strength++;

    if (/[A-Z]/.test(password)) strength++;
    if (/[#@*_/\-!$%^&]/.test(password)) strength++;

    return strength;
  });

  strengthLabel = computed(() => {
    const strength = this.passwordStrength();
    if (strength === 0) return { text: '', color: '' };
    if (strength <= 1) return { text: 'Weak', color: 'bg-red-500' };
    if (strength <= 2) return { text: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 3) return { text: 'Good', color: 'bg-blue-500' };
    return { text: 'Strong', color: 'bg-green-500' };
  });

  // Password requirements checker
  passwordChecks = computed(() => {
    const password = this.signUpModel().password;
    return [
      { label: '8+ characters', met: password.length >= 8 },
      { label: 'One number', met: /[0-9]/.test(password) },

      { label: 'One uppercase', met: /[A-Z]/.test(password) },
      { label: 'One special char', met: /[#@*_/\-!$%^&]/.test(password) },
    ];
  });

  // Check if passwords match
  passwordsMatch = computed(() => {
    const { password, confirmPassword } = this.signUpModel();
    return password.length > 0 && password === confirmPassword;
  });

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  selectRole(role: Role) {
    this.signUpModel.update((data) => ({ ...data, role }));
  }

  async onSubmit() {
    if (this.signUpForm().invalid() || !this.passwordsMatch()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { email, password, role } = this.signUpModel();

    try {
      await this.authService.register(email,password,role as string)
      this.successMessage.set('Registration successful! Please wait for admin approval before logging in.');

      // Reset form after successful registration
      this.signUpModel.set(signUpInitialData);
    } catch (error: unknown) {
      // Error is already a string from AuthService
      if (typeof error === 'string') {
        this.errorMessage.set(error);
      } else if (error instanceof Error) {
        this.errorMessage.set(error.message);
      } else {
        this.errorMessage.set('Registration failed');
      }
    } finally{
      this.isLoading.set(false);
    }
  }
}
