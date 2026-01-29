import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth-service';

export interface NavItem {
  path: string;
  label: string;
}

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {
  authService = inject(AuthService);

  title = input<string>('Dashboard');
  navItems = input<NavItem[]>([]);

  logout() {
    this.authService.logout();
  }
}