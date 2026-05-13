import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const DEBUG = true;

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="confirm-page">
      <div class="confirm-card">
        @if (loading()) {
          <div class="text-center">
            <div class="spinner"></div>
            <p class="mt-3 text-muted">Verificando tu cuenta...</p>
          </div>
        } @else if (success()) {
          <div class="text-center">
            <div class="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="mt-3">¡Cuenta verificada!</h2>
            <p class="text-muted">Tu correo electrónico ha sido confirmado correctamente.</p>
            <a routerLink="/login" class="btn btn-primary mt-3">
              Ir al Login
            </a>
          </div>
        } @else if (error()) {
          <div class="text-center">
            <div class="error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="mt-3">Error al verificar</h2>
            <p class="text-muted">{{ error() }}</p>
            <a routerLink="/register" class="btn btn-primary mt-3">
              Volver al Registro
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .confirm-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      padding: 20px;
    }
    .confirm-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .success-icon {
      color: #16a34a;
    }
    .error-icon {
      color: #dc2626;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary:hover {
      opacity: 0.9;
    }
    h2 { color: #1e293b; }
    .text-muted { color: #64748b; }
    .text-center { text-align: center; }
    .mt-3 { margin-top: 1rem; }
  `]
})
export class ConfirmEmail implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📧 [ConfirmEmail] Iniciando verificación...');

    const token = this.route.snapshot.queryParamMap.get('token');
    const type = this.route.snapshot.queryParamMap.get('type');
    const tokenHash = this.route.snapshot.queryParamMap.get('token_hash');

    if (DEBUG) console.log('📧 [ConfirmEmail] Params:', { token, type, tokenHash });

    try {
      const result = await this.authService.handleEmailConfirmation(
        token,
        type,
        tokenHash
      );

      if (DEBUG) console.log('📧 [ConfirmEmail] Resultado:', result);

      if (!result.success) {
        this.error.set(result.error || 'No se pudo verificar tu correo. Es posible que el enlace haya expirado.');
      } else {
        this.success.set(true);
      }
    } catch (err: any) {
      if (DEBUG) console.error('📧 [ConfirmEmail] Error:', err);
      this.error.set(err.message || 'Error al verificar el correo.');
    } finally {
      this.loading.set(false);
    }
  }
}
