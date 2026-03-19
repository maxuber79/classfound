import { Injectable, computed, inject, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
	private readonly supabaseService = inject(SupabaseService);

  /**
   * Signal interna que almacena la sesión activa de Supabase.
   * Si no existe sesión, su valor es null.
   */
  private readonly _session = signal<Session | null>(null);

  /**
   * Signal interna que almacena el usuario autenticado actual.
   * Si no existe usuario autenticado, su valor es null.
   */
  private readonly _user = signal<User | null>(null);

  /**
   * Signal interna para controlar el estado de carga inicial del servicio.
   * Se usa para saber cuándo la sesión ya fue consultada.
   */
  private readonly _loading = signal<boolean>(true);

  /**
   * Signal pública de solo lectura que expone la sesión actual.
   */
  readonly session = this._session.asReadonly();

  /**
   * Signal pública de solo lectura que expone el usuario actual.
   */
  readonly user = this._user.asReadonly();

  /**
   * Signal pública de solo lectura que indica si el servicio sigue cargando.
   */
  readonly loading = this._loading.asReadonly();

  /**
   * Signal derivada que indica si existe una sesión autenticada.
   */
  readonly isAuthenticated = computed(() => !!this._session());

  /**
   * Signal derivada que expone el email del usuario autenticado.
   * Si no existe usuario, devuelve null.
   */
  readonly userEmail = computed(() => this._user()?.email ?? null);

  constructor() {
    //console.log('[AuthService] Servicio inicializado');
		console.log('%c<<< Start AuthService >>>','background: #fff3cd; color: #664d03; padding: 2px 5px;');
    this.initializeAuth();
  }

  /**
   * Inicializa el estado de autenticación de la aplicación.
   *
   * Flujo:
   * 1. Consulta la sesión actual en Supabase.
   * 2. Guarda la sesión y el usuario en signals.
   * 3. Escucha cambios futuros de autenticación (login, logout, refresh, etc.).
   *
   * Este método se ejecuta automáticamente al instanciar el servicio.
   *
   * @returns {Promise<void>} Promesa resuelta cuando termina la carga inicial.
   */
  private async initializeAuth(): Promise<void> {
  console.log('[AuthService][initializeAuth] Iniciando...');

  this.supabaseService.client.auth.onAuthStateChange((event, session) => {
    console.log('[AuthService][onAuthStateChange] Evento recibido:', event);
    console.log('[AuthService][onAuthStateChange] Session recibida:', session);

    this._session.set(session);
    this._user.set(session?.user ?? null);

    // Marca loading como false cuando ya tenemos la sesión inicial
    if (event === 'INITIAL_SESSION') {
      this._loading.set(false);
    }

    console.log('[AuthService][onAuthStateChange] Session actualizada:', this._session());
    console.log('[AuthService][onAuthStateChange] User actualizado:', this._user());
  });
	// Agregar en initializeAuth() dentro del onAuthStateChange:
this.supabaseService.client.auth.onAuthStateChange((event, session) => {
  this._session.set(session);
  this._user.set(session?.user ?? null);

  if (event === 'INITIAL_SESSION') {
    this._loading.set(false);
  }

  // 👇 agrega esto
  if (event === 'PASSWORD_RECOVERY') {
    this._loading.set(false);
  }
});
	}

  /**
   * Inicia sesión con email y contraseña usando Supabase Auth.
   *
   * @param {string} email Correo del usuario.
   * @param {string} password Contraseña del usuario.
   * @returns {Promise<void>} Promesa resuelta si el login fue exitoso.
   * @throws {Error} Lanza error si Supabase responde con fallo de autenticación.
   */
  async signIn(email: string, password: string): Promise<void> {
    console.log('[AuthService][signIn] Intentando login con email:', email);

    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password
    });

    console.log('[AuthService][signIn] Respuesta signInWithPassword:', {
      data,
      error
    });

    if (error) {
      console.error('[AuthService][signIn] Error en login:', error.message);
      throw new Error(error.message);
    }

    console.log('[AuthService][signIn] Login correcto');
  }

  /**
   * Cierra la sesión actual del usuario autenticado.
   *
   * @returns {Promise<void>} Promesa resuelta si el logout fue exitoso.
   * @throws {Error} Lanza error si Supabase responde con fallo al cerrar sesión.
   */
  async signOut(): Promise<void> {
    console.log('[AuthService][signOut] Cerrando sesión...');

    const { error } = await this.supabaseService.client.auth.signOut();

    console.log('[AuthService][signOut] Resultado logout:', { error });

    if (error) {
      console.error('[AuthService][signOut] Error al cerrar sesión:', error.message);
      throw new Error(error.message);
    }

    console.log('[AuthService][signOut] Sesión cerrada correctamente');
  }

  /**
   * Devuelve el usuario autenticado actual de forma síncrona.
   * Útil para lecturas rápidas desde componentes o guards.
   *
   * @returns {User | null} Usuario autenticado actual o null.
   */
  getCurrentUser(): User | null {
    console.log('[AuthService][getCurrentUser] Usuario actual:', this._user());
    return this._user();
  }

  /**
   * Devuelve la sesión actual de forma síncrona.
   * Útil para validaciones o debugging.
   *
   * @returns {Session | null} Sesión activa o null.
   */
  getCurrentSession(): Session | null {
    console.log('[AuthService][getCurrentSession] Sesión actual:', this._session());
    return this._session();
  }

		async signUp(email: string, password: string): Promise<void> {
			const { error } = await this.supabaseService.client.auth.signUp({ email, password });
			if (error) throw new Error(error.message);
		}

		async resetPassword(email: string): Promise<void> {
			const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`
			});
			if (error) throw new Error(error.message);
		}

		// Agregar método al final de la clase:
		async updatePassword(newPassword: string): Promise<void> {
			const { error } = await this.supabaseService.client.auth.updateUser({
				password: newPassword
			});
			if (error) throw new Error(error.message);
		}

		
   
}
