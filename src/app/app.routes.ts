import { Routes } from '@angular/router';

// Auth pages
import { Login } from './auth/pages/login/login';
import { Register } from './auth/pages/register/register';
import { ForgotPassword } from './auth/pages/forgot-password/forgot-password';
import { ResetPassword } from './auth/pages/reset-password/reset-password';
// Dashboard layout
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { DashboardHome } from './features/dashboard/pages/dashboard-home/dashboard-home';
import { CategoriesPage } from './features/categories/pages/categories-page/categories-page';
import { TransactionsPage } from './features/transactions/pages/transactions/transactions';
import {  SchoolsPage } from './features/schools/pages/schools/schools';
// Módulos actuales
import { UsersPage } from './features/admin/users/pages/users-page/users-page';
import { ProfilePage }    from './features/profile/pages/profile-page/profile-page';
//Importar guard de autenticación
import { authGuard } from './auth/guards/auth.guard';
import { loginGuard } from './auth/guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [loginGuard] },
	{ path: 'reset-password', component: ResetPassword },
  { path: 'dashboard',
		component: Dashboard,
		canActivate: [authGuard],
	 	children: [			
      { path: 'home', loadComponent: () => import('./features/dashboard/pages/dashboard-home/dashboard-home').then(m => m.DashboardHome)},
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'admin/users', component: UsersPage   },
      { path: 'profile',     component: ProfilePage },
			//{ path: 'courses', loadComponent: () => import('./features/courses/pages/courses-page/courses-page.component').then(m => m.CoursesPageComponent)},
      { path: 'categories', loadComponent: () => import('./features/categories/pages/categories-page/categories-page').then(m => m.CategoriesPage)},
      { path: 'transactions', loadComponent: () => import('./features/transactions/pages/transactions/transactions').then(m => m.TransactionsPage)},
			{ path: 'schools', loadComponent: () => import('./features/schools/pages/schools/schools').then(m => m.SchoolsPage)} 
      //{ path: 'receipts', loadComponent: () => import('./features/receipts/pages/receipts-page/receipts-page.component').then(m => m.ReceiptsPageComponent)},
      //{ path: 'reports', loadComponent: () => import('./features/reports/pages/reports-page/reports-page.component').then(m => m.ReportsPageComponent)},// Aquí agregarás más rutas hijas: reportes, calendario, etc.
    ]
	},
	//{ path: 'admin/users', component: UsersPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
