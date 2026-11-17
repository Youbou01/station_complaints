import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./components/login-form/login-form').then(m => m.LoginForm)
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./components/sign-up-form/sign-up-form').then(m => m.SignUpForm)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin-layout/admin-layout').then(m => m.AdminLayout),
    canActivate: [authGuard, roleGuard(['administrator'])],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard)
      },
      {
        path: 'stations',
        loadComponent: () => import('./components/admin/stations-list/stations-list').then(m => m.StationsList)
      },
      {
        path: 'stations/new',
        loadComponent: () => import('./components/admin/stations-form/stations-form').then(m => m.StationForm)
      },
      {
        path: 'stations/:id/edit',
        loadComponent: () => import('./components/admin/stations-form/stations-form').then(m => m.StationForm)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/admin/users-list/users-list').then(m => m.UsersList)
      },
      {
        path: 'complaints',
        loadComponent: () => import('./components/admin/complaints-list/complaints-list').then(m => m.ComplaintsList)
      },
      {
        path: 'complaints/:id',
        loadComponent: () => import('./components/admin/complaint-detail/complaint-detail').then(m => m.ComplaintDetailComponent)
      },
      { path: 'departments', loadComponent: () => import('./components/admin/departments-list/departments-list').then(m => m.DepartmentsList) },
    ]
  },
  // Manager Routes
  {
    path: 'manager',
    loadComponent: () => import('./components/manager/manager-layout/manager-layout').then(m => m.ManagerLayout),
    canActivate: [authGuard, roleGuard(['manager'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./components/manager/manager-dashboard/manager-dashboard').then(m => m.ManagerDashboard) },
      { path: 'complaints', loadComponent: () => import('./components/manager/manager-complaints/manager-complaints').then(m => m.ManagerComplaints) },
      { path: 'new-complaint', loadComponent: () => import('./components/manager/new-complaint/new-complaint').then(m => m.NewComplaint) }
    ]
  },

  // Assistant Routes
  {
    path: 'assistant',
    loadComponent: () => import('./components/assistant/assistant-layout/assistant-layout').then(m => m.AssistantLayout),
    canActivate: [authGuard, roleGuard(['assistant'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./components/assistant/assistant-dashboard/assistant-dashboard').then(m => m.AssistantDashboard) },
      { path: 'complaints', loadComponent: () => import('./components/assistant/assistant-complaints/assistant-complaints').then(m => m.AssistantComplaints) }
    ]
  },

  // Intervenant Routes
  {
    path: 'intervenant',
    loadComponent: () => import('./components/intervenant/intervenant-layout/intervenant-layout').then(m => m.IntervenantLayout),
    canActivate: [authGuard, roleGuard(['intervenant'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./components/intervenant/intervenant-dashboard/intervenant-dashboard').then(m => m.IntervenantDashboard) },
      { path: 'complaints', loadComponent: () => import('./components/intervenant/intervenant-complaints/intervenant-complaints').then(m => m.IntervenantComplaints) }
    ]
  },
  // Director Routes
  {
    path: 'director',
    loadComponent: () => import('./components/director/director-layout/director-layout').then(m => m.DirectorLayout),
    canActivate: [authGuard, roleGuard(['director'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./components/director/director-dashboard/director-dashboard').then(m => m.DirectorDashboard) },
      { path: 'complaints', loadComponent: () => import('./components/director/director-complaints/director-complaints').then(m => m.DirectorComplaints) }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];