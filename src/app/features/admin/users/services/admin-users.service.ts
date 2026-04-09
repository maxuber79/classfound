import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AdminUser } from '../models/admin-user.interface';
import { CreateAdminUserPayload } from '../models/create-admin-user-payload.interface';

const DEBUG = true;

/**
 * Parámetros de consulta para obtener usuarios con filtros y paginación.
 */
export interface GetUsersParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Resultado paginado de usuarios.
 */
export interface GetUsersResult {
  users: AdminUser[];
  total: number;
}

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
   async getUsers(params: GetUsersParams = {}): Promise<GetUsersResult> {
		if (DEBUG) console.log('👥 [AdminUsersService][getUsers] Params:', params);

		const {
			search = '',
			role = '',
			status = '',
			page = 1,
			pageSize = 5
		} = params;

		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		let query = this.supabaseService.client
			.from('profiles')
			.select(
				`
					id, full_name, first_name, last_name, phone, avatar_url,
					email, global_role, is_active, created_at, updated_at,
					course_members (
						role,
						courses (
							id,
							name,
							school_id,
							schools (
								id,
								name
							)
						)
					)
				`,
				{ count: 'exact' }
			)
			.order('created_at', { ascending: false })
			.range(from, to);

		if (search.trim()) {
			query = query.or(
				`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
			);
		}

		if (role) {
			query = query.eq('global_role', role);
		}

		if (status !== '') {
			query = query.eq('is_active', status === 'true');
		}

		const { data, error, count } = await query;

		if (DEBUG) console.log('👥 [AdminUsersService][getUsers] Respuesta Supabase:', { data, error, count });

		if (error) {
			console.error('🔴 [AdminUsersService][getUsers] Error:', error.message);
			throw new Error(error.message);
		}

		// Mapear datos anidados a estructura plana
		const users: AdminUser[] = (data ?? []).map((profile: any) => {
			const member = profile.course_members?.[0];
			const course = member?.courses;
			const school = course?.schools;

			return {
				id:           profile.id,
				full_name:    profile.full_name,
				first_name:   profile.first_name,
				last_name:    profile.last_name,
				phone:        profile.phone,
				avatar_url:   profile.avatar_url,
				email:        profile.email,
				global_role:  profile.global_role,
				is_active:    profile.is_active,
				created_at:   profile.created_at,
				updated_at:   profile.updated_at,
				course_id:    course?.id ?? null,
				course_role:  member?.role ?? null,
				course_name:  course?.name ?? null,
				school_id:    school?.id ?? null,
				school_name:  school?.name ?? null,
			};
		});

		if (DEBUG) console.log('🟢 [AdminUsersService][getUsers] Total:', count, '| Página:', page);

		return { users, total: count ?? 0 };
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
    if (DEBUG) console.log('🚀 [AdminUsersService][createUser] Payload:', payload);

    try {
      const { data, error } = await this.supabaseService.client.functions.invoke(
        'create-user-admin',
        {
          body: payload,
          headers: {
            Authorization: `Bearer ${environment.supabase.supabaseLegacyAnonKey}`
          }
        }
      );

      if (DEBUG) console.log('📥 [AdminUsersService][createUser] Respuesta:', { data, error });

      if (error) {
        console.error('🔴 [AdminUsersService][createUser] Error Edge Function:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('🔴 [AdminUsersService][createUser] Error de negocio:', data);
        throw new Error(data?.message || 'No se pudo crear el usuario.');
      }

      if (DEBUG) console.log('🟢 [AdminUsersService][createUser] Usuario creado:', data.user);
      return data;

    } catch (err: any) {
      console.error('💥 [AdminUsersService][createUser] Excepción:', err);
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
    if (DEBUG) console.log('🔄 [AdminUsersService][toggleUserStatus] userId:', userId, '| nuevo estado:', !isActive);

    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({ is_active: !isActive })
      .eq('id', userId);

    if (error) {
      console.error('🔴 [AdminUsersService][toggleUserStatus] Error:', error.message);
      throw new Error(error.message);
    }

    if (DEBUG) console.log('🟢 [AdminUsersService][toggleUserStatus] Estado actualizado');
  }

	/**
	 * Actualiza el rol global de un usuario.
	 *
	 * @param {string} userId ID del usuario
	 * @param {string} newRole Nuevo rol a asignar
	 * @returns {Promise<void>}
	 */
	async updateUserRole(userId: string, newRole: string): Promise<void> {
    if (DEBUG) console.log('🛠️ [AdminUsersService][updateUserRole] userId:', userId, '| nuevo rol:', newRole);

    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({ global_role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('🔴 [AdminUsersService][updateUserRole] Error:', error.message);
      throw new Error(error.message);
    }

    if (DEBUG) console.log('🟢 [AdminUsersService][updateUserRole] Rol actualizado');
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
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    global_role: string;
    is_active: boolean;
  }): Promise<void> {
    if (DEBUG) console.log('✏️ [AdminUsersService][updateUserProfile] Payload:', payload);

    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({
        full_name: payload.full_name,
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        global_role: payload.global_role,
        is_active: payload.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.id);

    if (error) {
      console.error('🔴 [AdminUsersService][updateUserProfile] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [AdminUsersService][updateUserProfile] Perfil actualizado');
  }

	/**
	 * Inserta o actualiza la membresía de un usuario en un curso.
	 * Si ya existe una membresía activa, la actualiza.
	 * Si no existe, la crea.
	 *
	 * @param {string} userId ID del usuario
	 * @param {string} courseId ID del curso
	 * @param {string} courseRole Rol en el curso
	 * @returns {Promise<void>}
	 */
	async upsertCourseMember(userId: string, courseId: string, courseRole: string): Promise<void> {
		if (DEBUG) console.log('📘 [AdminUsersService][upsertCourseMember] userId:', userId, '| courseId:', courseId, '| role:', courseRole);

		// Verificar si ya existe una membresía
		const { data: existing } = await this.supabaseService.client
			.from('course_members')
			.select('id')
			.eq('user_id', userId)
			.single();

		if (existing?.id) {
			// Actualizar membresía existente
			const { error } = await this.supabaseService.client
				.from('course_members')
				.update({
					course_id: courseId,
					role: courseRole,
					is_active: true,
					updated_at: new Date().toISOString()
				})
				.eq('user_id', userId);

			if (error) {
				console.error('🔴 [AdminUsersService][upsertCourseMember] Error al actualizar:', error);
				throw error;
			}
			if (DEBUG) console.log('✅ [AdminUsersService][upsertCourseMember] Membresía actualizada');

		} else {
			// Crear nueva membresía
			const { error } = await this.supabaseService.client
				.from('course_members')
				.insert({
					course_id: courseId,
					user_id: userId,
					role: courseRole,
					is_active: true
				});

			if (error) {
				console.error('🔴 [AdminUsersService][upsertCourseMember] Error al insertar:', error);
				throw error;
			}
			if (DEBUG) console.log('✅ [AdminUsersService][upsertCourseMember] Membresía creada');
		}
	}

	/**
	 * Obtiene los roles ya ocupados en un curso específico.
	 * Excluye opcionalmente al usuario actual para no bloquearse en edición.
	 *
	 * @param {string} courseId ID del curso.
	 * @param {string | null} excludeUserId ID del usuario a excluir (edición).
	 * @returns {Promise<string[]>} Lista de roles ocupados.
	 */
	async getOccupiedRoles(courseId: string, excludeUserId: string | null = null): Promise<string[]> {
		if (DEBUG) console.log('🔍 [AdminUsersService][getOccupiedRoles] courseId:', courseId, '| excludeUserId:', excludeUserId);

		let query = this.supabaseService.client
			.from('course_members')
			.select('role, user_id')
			.eq('course_id', courseId)
			.eq('is_active', true)
			.neq('role', 'apoderado'); // apoderado puede repetirse

		if (excludeUserId) {
			query = query.neq('user_id', excludeUserId);
		}

		const { data, error } = await query;

		if (error) {
			console.error('🔴 [AdminUsersService][getOccupiedRoles] Error:', error);
			return [];
		}

		const occupied = (data ?? []).map((m: any) => m.role);
		if (DEBUG) console.log('✅ [AdminUsersService][getOccupiedRoles] Roles ocupados:', occupied);
		return occupied;
	}

	/**
	 * Elimina un usuario completo del sistema.
	 * Llama a la Edge Function delete-user-admin que borra en cascada:
	 * course_members → profiles → auth.users
	 *
	 * @param {string} userId ID del usuario a eliminar.
	 * @returns {Promise<void>}
	 * @throws {Error} Si falla la invocación o la función responde sin éxito.
	 */
	async deleteUser(userId: string): Promise<void> {
		if (DEBUG) console.log('🗑️ [AdminUsersService][deleteUser] userId:', userId);

		const { data, error } = await this.supabaseService.client.functions.invoke(
			'delete-user-admin',
			{
				body: { user_id: userId },
				headers: {
					Authorization: `Bearer ${this.supabaseService.anonKey}`,
				},
			}
		);

		if (error) {
			console.error('🔴 [AdminUsersService][deleteUser] Error Edge Function:', error);
			throw error;
		}

		if (!data?.success) {
			console.error('🔴 [AdminUsersService][deleteUser] Error de negocio:', data);
			throw new Error(data?.message || 'No se pudo eliminar el usuario.');
		}

		if (DEBUG) console.log('✅ [AdminUsersService][deleteUser] Usuario eliminado:', userId);
	}
}