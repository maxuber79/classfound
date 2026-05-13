import { Routes } from '@angular/router';

// Auth pages
import { Login } from './auth/pages/login/login';
import { Register } from './auth/pages/register/register';
import { ForgotPassword } from './auth/pages/forgot-password/forgot-password';
import { ResetPassword } from './auth/pages/reset-password/reset-password';
import { ConfirmEmail } from './auth/pages/confirm-email/confirm-email';
// Dashboard layout
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';

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
  { path: 'confirm-email', component: ConfirmEmail },
  { path: 'dashboard',
		component: Dashboard,
		canActivate: [authGuard],
	 	children: [			
			{ path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', loadComponent: () => import('./features/dashboard/pages/dashboard-home/dashboard-home').then(m => m.DashboardHome)},
      { path: 'admin/users', loadComponent: () => import('./features/admin/users/pages/users-page/users-page').then(m => m.UsersPage), canActivate: [roleGuard]   },
      { path: 'profile', loadComponent: () => import('./features/profile/pages/profile-page/profile-page').then(m => m.ProfilePage) },
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
