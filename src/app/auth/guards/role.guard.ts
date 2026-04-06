import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas exclusivas de administrador.
 * Espera a que el perfil esté cargado antes de evaluar el rol.
 * Si el usuario no es admin o superior, redirige al dashboard/home.
 */
export const roleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 [roleGuard] Evaluando rol...');

  // Espera a que el perfil no sea null antes de evaluar
  return toObservable(authService.profile).pipe(
    filter(profile => profile !== null), // 👈 espera perfil cargado
    take(1),
    map(profile => {
      const role = profile?.global_role;
      const isAdmin = role === 'admin' || role === 'super_admin';
      console.log('🔐 [roleGuard] global_role:', role);
      console.log('🔐 [roleGuard] isAdmin:', isAdmin);

      if (isAdmin) {
        console.log('✅ [roleGuard] Acceso permitido');
        return true;
      }

      console.warn('⛔ [roleGuard] Sin permisos, redirigiendo a /dashboard/home');
      return router.createUrlTree(['/dashboard/home']);
    })
  );
};