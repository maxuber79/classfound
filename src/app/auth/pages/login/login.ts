import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Getters para acceder fácil desde el HTML
  get email() { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }

  togglePassword(): void {
 	 this.showPassword.update(v => !v);
	}

 

  async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.signIn(email, password);
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('🔴 [Login] Error:', error);
      this.errorMessage.set(error.message ?? 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }

		
  }

 

onForgotPassword(): void {
  this.router.navigate(['/forgot-password']);
}

  onGoogleLogin(): void {
    console.log('🔴 [Login] Login con Google');
    alert('Login con Google: próximamente');
  }

  onFacebookLogin(): void {
    console.log('🔵 [Login] Login con Facebook');
    alert('Login con Facebook: próximamente');
  }
}