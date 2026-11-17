import { Component } from '@angular/core';
import { DashboardLayout, NavItem } from '../../shared/dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-assistant-layout',
  imports: [DashboardLayout],
  template: `
    <app-dashboard-layout [title]="'Assistant'" [navItems]="navItems" />
  `,
})
export class AssistantLayout {
  navItems: NavItem[] = [
    { path: '/assistant/dashboard', label: 'Dashboard' },
    { path: '/assistant/complaints', label: 'All Complaints' },
  ];
}