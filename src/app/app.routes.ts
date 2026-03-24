import { Routes } from '@angular/router';



//Importar componentes de las páginas
import { Login } from './auth/pages/login/login';
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { Register } from './auth/pages/register/register';
import { ForgotPassword } from './auth/pages/forgot-password/forgot-password';
import { ResetPassword } from './auth/pages/reset-password/reset-password';
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
      { path: '',            pathMatch: 'full', redirectTo: 'admin/users' },
      { path: 'admin/users', component: UsersPage   },
      { path: 'profile',     component: ProfilePage },
      // Aquí agregarás más rutas hijas: reportes, calendario, etc.
    ]
	},
	//{ path: 'admin/users', component: UsersPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
