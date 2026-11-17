import { Component, inject } from '@angular/core';
import { AuthService } from '../../../services/auth-service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  authService:AuthService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
