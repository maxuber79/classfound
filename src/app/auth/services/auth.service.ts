import { Injectable, computed, inject, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/services/supabase.service';
import { AdminUser } from '../../features/admin/users/models/admin-user.interface';
import { CourseMember } from '../../shared/models/course-member.interface';

const DEBUG = true;
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

	/**
 * Signal interna que almacena el perfil completo del usuario autenticado
 * desde la tabla profiles, incluyendo global_role.
 */
	private readonly _profile = signal<AdminUser | null>(null);

	/**
	 * Signal pública de solo lectura que expone el perfil actual.
	 */
	readonly profile = this._profile.asReadonly();

	/**
	 * Signal derivada que indica si el usuario tiene rol super_admin.
	 * Se usa para proteger rutas y elementos exclusivos de super administrador.
	 */
	readonly isSuperAdmin = computed(() => {
		const role = this._profile()?.global_role;
		console.log('[AuthService][isSuperAdmin] global_role:', role);
		return role === 'super_admin';
	});

	/**
	 * Signal derivada que indica si el usuario tiene rol admin o superior.
	 * Se usa para proteger rutas y elementos del panel de administración.
	 */
	readonly isAdmin = computed(() => {
		const role = this._profile()?.global_role;
		console.log('[AuthService][isAdmin] global_role:', role);
		return role === 'admin' || role === 'super_admin';
	});

	/**
	 * Signal interna que almacena la membresía del usuario en un curso.
	 * Contiene course_id y role dentro del curso si es usuario contextual.
	 */
	private readonly _courseProfile = signal<CourseMember | null>(null);

	/**
	 * Signal pública de solo lectura que expone la membresía del curso actual.
	 */
	readonly courseProfile = this._courseProfile.asReadonly();

	/**
	 * Signal derivada que indica si el usuario es miembro activo de algún curso.
	 */
	readonly isCourseUser = computed(() => !!this._courseProfile());

	constructor() {
		//console.log('[AuthService] Servicio inicializado');
		console.log('%c<<< Start AuthService >>>', 'background: #fff3cd; color: #664d03; padding: 2px 5px;');
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

			if (event === 'INITIAL_SESSION') {
				this._loading.set(false);
			}

			if (event === 'PASSWORD_RECOVERY') {
				this._loading.set(false);
			}

			console.log('[AuthService][onAuthStateChange] Session actualizada:', this._session());
			console.log('[AuthService][onAuthStateChange] User actualizado:', this._user());

			// 👇 cargar perfil
			if (session?.user) {
				console.log('[AuthService][onAuthStateChange] Cargando perfil del usuario...');
				this.loadProfile(session.user.id);
			} else {
				console.log('[AuthService][onAuthStateChange] Sin sesión, limpiando perfil...');
				this._profile.set(null);
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

	/**
	 * Carga el perfil completo del usuario autenticado desde la tabla profiles.
	 * Incluye global_role para determinar permisos en el frontend.
	 * Se llama automáticamente al detectar una sesión activa.
	 *
	 * @param {string} userId ID del usuario autenticado desde auth.users.
	 * @returns {Promise<void>}
	 */
	private async loadProfile(userId: string): Promise<void> {
		console.log('[AuthService][loadProfile] Cargando perfil para userId:', userId);

		const { data, error } = await this.supabaseService.client
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.single();

		if (error) {
			console.error('[AuthService][loadProfile] Error al cargar perfil:', error);
			this._profile.set(null);
			return;
		}

		console.log('[AuthService][loadProfile] Perfil cargado:', data);
		console.log('[AuthService][loadProfile] global_role:', data?.global_role);
		// después
		this._profile.set(data as AdminUser);

		// Si no es admin, carga membresía de curso
		if (data?.global_role === 'user') {
			this.loadCourseProfile(userId);
		}
	}

	/**
	 * Carga la membresía activa del usuario en course_members.
	 * Se llama después de loadProfile() cuando el usuario no es admin.
	 *
	 * @param {string} userId ID del usuario autenticado.
	 * @returns {Promise<void>}
	 */
	private async loadCourseProfile(userId: string): Promise<void> {
		if (DEBUG) console.log('[AuthService][loadCourseProfile] Cargando membresía para userId:', userId);

		// después
		const { data, error } = await this.supabaseService.client
			.from('course_members')
			.select(`
				*,
				courses (
					id,
					name,
					school_id,
					schools (
						id,
						name
					)
				)
			`)
			.eq('user_id', userId)
			.eq('is_active', true)
			.single();

		if (error) {
			if (DEBUG) console.warn('[AuthService][loadCourseProfile] Sin membresía activa:', error.message);
			this._courseProfile.set(null);
			return;
		}

		if (DEBUG) console.log('[AuthService][loadCourseProfile] Membresía cargada:', data);
		this._courseProfile.set(data as CourseMember);
	}
}
