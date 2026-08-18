// login.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Detectar token de recovery en la URL y redirigir a /reset-password
  if (window.location.hash.includes('type=recovery')) {
    console.log('🔄 Recovery detectado en URL, redirigiendo a /reset-password');
    return router.createUrlTree(['/reset-password']);
  }

  return toObservable(authService.loading).pipe(
    filter(loading => !loading),
    take(1),
    map(() => {
      if (authService.isAuthenticated()) {
        console.log('🔄 Ya autenticado, redirigiendo a /dashboard');
        return router.createUrlTree(['/dashboard']);
      }
      return true;
    })
  );
};