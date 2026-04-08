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
import { ReceiptsPage } from './features/receipts/pages/receipts-page/receipts-page';
import { ReportsPage } from './features/reports/pages/reports-page/reports-page';


// Módulos actuales
import { UsersPage } from './features/admin/users/pages/users-page/users-page';
import { ProfilePage }    from './features/profile/pages/profile-page/profile-page';
import { CoursePage } from './features/courses/pages/course-page/course';

//Importar guard de autenticación
import { authGuard } from './auth/guards/auth.guard';
import { loginGuard } from './auth/guards/login.guard';
import { roleGuard } from './auth/guards/role.guard';

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
			{ path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./features/dashboard/pages/dashboard-home/dashboard-home').then(m => m.DashboardHome)},
      { path: 'admin/users', component: UsersPage, canActivate: [roleGuard]   },
      { path: 'profile',     component: ProfilePage },
			{ path: 'courses', loadComponent: () => import('./features/courses/pages/course-page/course').then(m => m.CoursePage), canActivate: [roleGuard]},
      { path: 'categories', loadComponent: () => import('./features/categories/pages/categories-page/categories-page').then(m => m.CategoriesPage)},
      { path: 'transactions', loadComponent: () => import('./features/transactions/pages/transactions/transactions').then(m => m.TransactionsPage), canActivate: [roleGuard]},
			{ path: 'courses/:courseId/transactions', loadComponent: () => import('./features/transactions/pages/transactions/transactions').then(m => m.TransactionsPage)},
			{ path: 'schools', loadComponent: () => import('./features/schools/pages/schools/schools').then(m => m.SchoolsPage), canActivate: [roleGuard]}, 
      { path: 'receipts', loadComponent: () => import('./features/receipts/pages/receipts-page/receipts-page').then(m => m.ReceiptsPage)},
      { path: 'reports', loadComponent: () => import('./features/reports/pages/reports-page/reports-page').then(m => m.ReportsPage )},
			// Aquí agregarás más rutas hijas: reportes, calendario, etc.
    ]
	},
	//{ path: 'admin/users', component: UsersPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
