import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AdminUser } from '../models/admin-user.interface';
import { CreateAdminUserPayload } from '../models/create-admin-user-payload.interface';


@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly supabaseService = inject(SupabaseService);

  /**
   * Obtiene la lista de usuarios desde la tabla `profiles`.
   *
   * Flujo:
   * 1. Consulta la tabla `profiles`.
   * 2. Ordena por fecha de creación descendente.
   * 3. Devuelve la lista tipada como `AdminUser[]`.
   *
   * @returns {Promise<AdminUser[]>} Lista de usuarios administrables.
   * @throws {Error} Lanza error si la consulta falla.
   */
  async getUsers(): Promise<AdminUser[]> {
    console.log('👥 [AdminUsersService][getUsers] Consultando usuarios...');

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('id, full_name, email, global_role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    console.log('👥 [AdminUsersService][getUsers] Respuesta Supabase:', {
      data,
      error
    });

    if (error) {
      console.error('🔴 [AdminUsersService][getUsers] Error al obtener usuarios:', error.message);
      throw new Error(error.message);
    }

    console.log('🟢 [AdminUsersService][getUsers] Usuarios obtenidos correctamente');
    return (data ?? []) as AdminUser[];
  }

	/**
	 * Crea un usuario administrativo invocando la Edge Function segura.
	 *
	 * Flujo:
	 * 1. Envía el payload a la Edge Function `create-user-admin`.
	 * 2. La función crea el usuario en Supabase Auth.
	 * 3. La función guarda/actualiza el registro en `profiles`.
	 * 4. Retorna la respuesta al frontend.
	 *
	 * @param {CreateAdminUserPayload} payload Datos del usuario a crear.
	 * @returns {Promise<any>} Respuesta de la Edge Function.
	 * @throws {Error} Lanza error si la invocación falla o si la función responde sin éxito.
	 */
	/**
	 * Crea un usuario administrativo invocando la Edge Function segura.
	 *
	 * @param {CreateAdminUserPayload} payload Datos del usuario a crear.
	 * @returns {Promise<any>} Respuesta de la Edge Function.
	 */
	async createUser(payload: CreateAdminUserPayload): Promise<any> {
		console.log('🚀 [AdminUsersService][createUser] Iniciando creación de usuario...');
		console.log('📦 [AdminUsersService][createUser] Payload:', payload);

		try {
			const { data, error } = await this.supabaseService.client.functions.invoke(
				'create-user-admin',
				{
					body: payload,
					headers: {
						// 🔐 CLAVE IMPORTANTE (legacy anon)
						Authorization: `Bearer ${environment.supabase.supabaseLegacyAnonKey}`
					}
				}
			);

			console.log('📥 [AdminUsersService][createUser] Respuesta completa:', {
				data,
				error
			});

			// ❌ Error técnico (HTTP, network, etc)
			if (error) {
				console.error('🔴 [AdminUsersService][createUser] Error al invocar Edge Function:', error);
				throw error;
			}

			// ❌ Error de negocio (respuesta de la function)
			if (!data?.success) {
				console.error('🔴 [AdminUsersService][createUser] Error de negocio:', data);
				throw new Error(data?.message || 'No se pudo crear el usuario.');
			}

			// ✅ OK
			console.log('🟢 [AdminUsersService][createUser] Usuario creado correctamente:', data.user);
			return data;

		} catch (err: any) {
			console.error('💥 [AdminUsersService][createUser] Excepción capturada:', err);
			throw new Error(err?.message || 'Error inesperado al crear usuario.');
		}
	}
	

	/**
	 * Cambia el estado activo/inactivo de un usuario.
	 *
	 * @param {string} userId ID del usuario
	 * @param {boolean} isActive Estado actual
	 * @returns {Promise<void>}
	 */
	async toggleUserStatus(userId: string, isActive: boolean): Promise<void> {
		console.log('🔄 [AdminUsersService][toggleUserStatus] Cambiando estado...');
		console.log('👉 userId:', userId, '| nuevo estado:', !isActive);

		const { error } = await this.supabaseService.client
			.from('profiles')
			.update({ is_active: !isActive })
			.eq('id', userId);

		if (error) {
			console.error('🔴 Error al actualizar estado:', error.message);
			throw new Error(error.message);
		}

		console.log('🟢 Estado actualizado correctamente');
	}

	/**
	 * Actualiza el rol global de un usuario.
	 *
	 * @param {string} userId ID del usuario
	 * @param {string} newRole Nuevo rol a asignar
	 * @returns {Promise<void>}
	 */
	async updateUserRole(userId: string, newRole: string): Promise<void> {
		console.log('🛠️ [AdminUsersService][updateUserRole] Actualizando rol...');
		console.log('👉 userId:', userId, '| nuevo rol:', newRole);

		const { error } = await this.supabaseService.client
			.from('profiles')
			.update({ global_role: newRole })
			.eq('id', userId);

		if (error) {
			console.error('🔴 Error al actualizar rol:', error.message);
			throw new Error(error.message);
		}

		console.log('🟢 Rol actualizado correctamente');
	}

	/**
	 * Actualiza el perfil de un usuario en la tabla profiles.
	 *
	 * @param payload Datos editables del usuario.
	 * @returns {Promise<void>}
	 */
	async updateUserProfile(payload: {
		id: string;
		full_name: string;
		global_role: string;
		is_active: boolean;
	}): Promise<void> {
		console.log('✏️ [AdminUsersService][updateUserProfile] Payload recibido:', payload);

		const { error } = await this.supabaseService.client
			.from('profiles')
			.update({
				full_name: payload.full_name,
				global_role: payload.global_role,
				is_active: payload.is_active,
				updated_at: new Date().toISOString()
			})
			.eq('id', payload.id);

		if (error) {
			console.error('🔴 [AdminUsersService][updateUserProfile] Error al actualizar perfil:', error);
			throw error;
		}

		console.log('✅ [AdminUsersService][updateUserProfile] Perfil actualizado correctamente');
	}
}