import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl) {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);

  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator });

  get password() { return this.resetForm.get('password')!; }
  get confirmPassword() { return this.resetForm.get('confirmPassword')!; }

  togglePassword(): void { this.showPassword.update(v => !v); }
  toggleConfirm(): void { this.showConfirm.update(v => !v); }

  async resetPassword(): Promise<void> {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.updatePassword(this.resetForm.value.password);
      this.successMessage.set('Contraseña actualizada correctamente.');
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (error: any) {
      this.errorMessage.set(error.message ?? 'Error al actualizar la contraseña');
    } finally {
      this.loading.set(false);
    }
  }
}