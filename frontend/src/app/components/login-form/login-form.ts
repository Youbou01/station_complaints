import { Component, effect, inject, signal } from '@angular/core';
import { LoginData, loginInitialData, loginSchema } from '../../models/auth';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-login-form',
  imports: [FormField,RouterLink,FormsModule,ReactiveFormsModule],
  templateUrl: './login-form.html',
  styleUrl: './login-form.css',
})
export class LoginForm {
  private router = inject(Router);
  private authService = inject(AuthService);

  loginModel = signal<LoginData>(loginInitialData);
  loginForm = form(this.loginModel, loginSchema);

  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string>('');

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  async onSubmit() {
    if (this.loginForm().invalid()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.loginModel();

    try {
      const user = await this.authService.login(email, password);
      
      if (user.role === 'administrator') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      this.errorMessage.set(error as string);
    } finally {
      this.isLoading.set(false);
    }
  }
}
