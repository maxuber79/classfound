import { Routes } from '@angular/router';



//Importar componentes de las páginas
import { Login } from './auth/pages/login/login';
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { Register } from './auth/pages/register/register';
import { ForgotPassword } from './auth/pages/forgot-password/forgot-password';
import { ResetPassword } from './auth/pages/reset-password/reset-password';
import { UsersPage } from './features/admin/users/pages/users-page/users-page';

//Importar guard de autenticación
import { authGuard } from './auth/guards/auth.guard';
import { loginGuard } from './auth/guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'register', component: Register, canActivate: [loginGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [loginGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
	{ path: 'admin/users', component: UsersPage, canActivate: [authGuard] },
	{ path: 'reset-password', component: ResetPassword },
  { path: '**', redirectTo: 'login' }
];
