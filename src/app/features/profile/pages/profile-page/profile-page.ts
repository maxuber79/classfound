import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { Profile } from '../../models/profile.interface';

const DEBUG = true;

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss'
})
export class ProfilePage implements OnInit {

  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  // ─── Estado ───────────────────────────────────────────────────────────────────
  readonly loading        = signal(false);
  readonly saving         = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage   = signal<string | null>(null);

  profile: Profile | null = null;
  profileForm!: FormGroup;

  /**
   * Controla si el formulario está en modo visualización (true) o edición (false).
   * Por defecto arranca en modo visualización con campos deshabilitados.
   */
  isViewMode: boolean = true;

  /**
   * URL de preview del avatar en tiempo real mientras el usuario escribe.
   * Si la URL es inválida o está vacía, vale null.
   */
  avatarPreview: string | null = null;

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización. Carga el perfil del usuario autenticado
   * y puebla el formulario con sus datos.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [ProfilePage][ngOnInit] Inicializando...');
    this.initForm();
    await this.loadProfile();
  }

  // ─── Setup ────────────────────────────────────────────────────────────────────

  /**
   * Inicializa el formulario reactivo en modo deshabilitado (visualización).
   * Los campos se pueblan después con patchValue al cargar el perfil.
   */
  private initForm(): void {
    if (DEBUG) console.log('🧩 [ProfilePage][initForm] Inicializando formulario...');

    this.profileForm = this.fb.group({
      first_name: [{ value: '', disabled: true }, [Validators.required, Validators.minLength(2)]],
      last_name:  [{ value: '', disabled: true }, [Validators.required, Validators.minLength(2)]],
      phone:      [{ value: '', disabled: true }],
      avatar_url: [{ value: '', disabled: true }],
    });

    if (DEBUG) console.log('✅ [ProfilePage][initForm] Formulario creado en modo visualización');
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────────

  /**
   * Carga el perfil del usuario autenticado desde Supabase
   * y puebla el formulario con los datos obtenidos.
   * También inicializa el preview del avatar si ya tiene URL guardada.
   *
   * @returns {Promise<void>}
   */
  async loadProfile(): Promise<void> {
    if (DEBUG) console.log('📥 [ProfilePage][loadProfile] Cargando perfil...');
    this.loading.set(true);
    this.clearMessages();

    try {
      this.profile = await this.profileService.getProfile();

      this.profileForm.patchValue({
        first_name: this.profile.first_name ?? '',
        last_name:  this.profile.last_name  ?? '',
        phone:      this.profile.phone      ?? '',
        avatar_url: this.profile.avatar_url ?? '',
      });

      // Inicializar preview con la URL guardada
      this.avatarPreview = this.profile.avatar_url || null;

      if (DEBUG) console.log('🟢 [ProfilePage][loadProfile] Perfil cargado:', this.profile);

    } catch (error: any) {
      console.error('🔴 [ProfilePage][loadProfile] Error:', error);
      this.errorMessage.set('No se pudo cargar el perfil. Intenta nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Modo edición ─────────────────────────────────────────────────────────────

  /**
   * Activa el modo edición habilitando todos los campos del formulario.
   * Cambia isViewMode a false para que el botón muestre "Guardar cambios".
   */
  enableEditMode(): void {
    if (DEBUG) console.log('🛠️ [ProfilePage][enableEditMode] Activando modo edición');
    this.isViewMode = false;
    this.profileForm.enable();
  }

  /**
   * Cancela la edición, deshabilita los campos y vuelve al modo visualización.
   * Restaura los valores originales del perfil.
   */
  cancelEdit(): void {
    if (DEBUG) console.log('↩️ [ProfilePage][cancelEdit] Cancelando edición');
    this.isViewMode = true;
    this.profileForm.disable();
    this.clearMessages();

    // Restaurar valores originales
    if (this.profile) {
      this.profileForm.patchValue({
        first_name: this.profile.first_name ?? '',
        last_name:  this.profile.last_name  ?? '',
        phone:      this.profile.phone      ?? '',
        avatar_url: this.profile.avatar_url ?? '',
      });
      this.avatarPreview = this.profile.avatar_url || null;
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  /**
   * Envía el formulario para actualizar el perfil del usuario.
   * Al guardar exitosamente vuelve al modo visualización.
   * Construye full_name automáticamente desde first_name + last_name.
   *
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    if (DEBUG) console.log('🚀 [ProfilePage][onSubmit] Guardando perfil...');

    if (this.profileForm.invalid) {
      console.warn('⚠️ [ProfilePage][onSubmit] Formulario inválido');
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.clearMessages();

    try {
      const raw = this.profileForm.getRawValue();

      const payload = {
        first_name: raw.first_name?.trim() || null,
        last_name:  raw.last_name?.trim()  || null,
        full_name:  `${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim(),
        phone:      raw.phone?.trim()      || null,
        avatar_url: raw.avatar_url?.trim() || null,
      };

      if (DEBUG) console.log('📦 [ProfilePage][onSubmit] Payload:', payload);

      await this.profileService.updateProfile(payload);

      if (DEBUG) console.log('✅ [ProfilePage][onSubmit] Actualizado');

      // Volver a modo visualización al guardar
      this.isViewMode = true;
      this.profileForm.disable();
      this.successMessage.set('Perfil actualizado correctamente.');

      await this.loadProfile();

    } catch (error: any) {
      console.error('🔴 [ProfilePage][onSubmit] Error:', error);
      this.errorMessage.set('No se pudo actualizar el perfil. Intenta nuevamente.');
    } finally {
      this.saving.set(false);
    }
  }

  // ─── Avatar preview ───────────────────────────────────────────────────────────

  /**
   * Actualiza el preview del avatar en tiempo real mientras el usuario escribe
   * en el campo avatar_url. Solo activa el preview si la URL empieza con http.
   */
  onAvatarUrlInput(): void {
    const url = this.profileForm.get('avatar_url')?.value?.trim();
    if (DEBUG) console.log('🖼️ [ProfilePage][onAvatarUrlInput] URL:', url);
    this.avatarPreview = url?.startsWith('http') ? url : null;
  }

  /**
   * Maneja el error de carga del avatar principal.
   * Si la URL falla, oculta la imagen para que se muestre el fallback de inicial.
   *
   * @param {Event} event Evento de error del elemento img.
   */
  onAvatarError(event: Event): void {
    if (DEBUG) console.warn('⚠️ [ProfilePage][onAvatarError] Error al cargar avatar principal');
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  /**
   * Maneja el error de carga del preview miniatura en el input.
   * Si la URL no carga, oculta la miniatura sin afectar el input.
   *
   * @param {Event} event Evento de error del elemento img.
   */
  onPreviewError(event: Event): void {
    if (DEBUG) console.warn('⚠️ [ProfilePage][onPreviewError] Error al cargar preview');
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.avatarPreview = null;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Limpia los mensajes de éxito y error del formulario.
   */
  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Retorna la inicial del nombre o email para el avatar placeholder.
   * @returns {string}
   */
  getInitial(): string {
    const name = this.profile?.full_name || this.profile?.email || '?';
    return name.charAt(0).toUpperCase();
  }
}