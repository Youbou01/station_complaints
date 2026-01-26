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
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
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
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];