import { Component } from '@angular/core';
import { DashboardLayout, NavItem } from '../../shared/dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-director-layout',
  imports: [DashboardLayout],
  template: `
    <app-dashboard-layout [title]="'Director'" [navItems]="navItems" />
  `,
})
export class DirectorLayout {
  navItems: NavItem[] = [
    { path: '/director/dashboard', label: 'Dashboard' },
    { path: '/director/complaints', label: 'All Complaints' },
  ];
}