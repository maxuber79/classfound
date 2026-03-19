// login.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

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