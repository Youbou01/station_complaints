import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { SignUpData, signUpInitialData, signUpSchema, Role, ROLE_OPTIONS } from '../../models/auth';

@Component({
  selector: 'app-sign-up-form',
  imports: [FormField, RouterLink],
  templateUrl: './sign-up-form.html',
  styleUrl: './sign-up-form.css',
})
export class SignUpForm {
  private router = inject(Router);

  // Form model and schema
  signUpModel = signal<SignUpData>(signUpInitialData);
  signUpForm = form(this.signUpModel, signUpSchema);

  // UI State
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  roleOptions = ROLE_OPTIONS;

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

  onSubmit() {
    if (this.signUpForm().invalid() || !this.passwordsMatch()) return;

    this.isLoading.set(true);

    // TODO: Call auth service
    console.log('Sign up attempt:', this.signUpModel());

    // Simulate API call
    setTimeout(() => {
      this.isLoading.set(false);
      this.router.navigate(['/auth/login']);
    }, 1500);
  }
}
