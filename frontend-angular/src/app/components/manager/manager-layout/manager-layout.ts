import { Component } from '@angular/core';
import { DashboardLayout, NavItem } from '../../shared/dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-manager-layout',
  imports: [DashboardLayout],
  template: `
    <app-dashboard-layout [title]="'Manager'" [navItems]="navItems" />
  `,
})
export class ManagerLayout {
  navItems: NavItem[] = [
    { path: '/manager/dashboard', label: 'Dashboard' },
    { path: '/manager/complaints', label: 'My Complaints' },
    { path: '/manager/new-complaint', label: 'New Complaint' },
  ];
}