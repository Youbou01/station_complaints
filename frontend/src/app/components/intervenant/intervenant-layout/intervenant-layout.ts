import { Component } from '@angular/core';
import { DashboardLayout, NavItem } from '../../shared/dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-intervenant-layout',
  imports: [DashboardLayout],
  template: `
    <app-dashboard-layout [title]="'Intervenant'" [navItems]="navItems" />
  `,
})
export class IntervenantLayout {
  navItems: NavItem[] = [
    { path: '/intervenant/dashboard', label: 'Dashboard' },
    { path: '/intervenant/complaints', label: 'My Assignments' },
  ];
}