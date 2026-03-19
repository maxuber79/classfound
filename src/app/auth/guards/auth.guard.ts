import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ [authGuard] Evaluando acceso...');

  // Espera a que loading sea false, luego decide
  return toObservable(authService.loading).pipe(
    filter(loading => !loading),   // ⏳ espera hasta que termine de cargar
    take(1),                        // toma solo el primer valor
    map(() => {
      const isAuth = authService.isAuthenticated();
      console.log('isAuthenticated:', isAuth);

      if (isAuth) {
        console.log('✅ Acceso permitido');
        return true;
      }

      console.warn('⛔ No autenticado, redirigiendo a /login');
      return router.createUrlTree(['/login']);
    })
  );
};