import { Routes } from '@angular/router';

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
    path: '**',
    redirectTo: 'auth/login'
  }
];