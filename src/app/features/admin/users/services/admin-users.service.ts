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
        'id, full_name, first_name, last_name, phone, avatar_url, email, global_role, is_active, created_at, updated_at',
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

    if (DEBUG) console.log('🟢 [AdminUsersService][getUsers] Total:', count, '| Página:', page);

    return {
      users: (data ?? []) as AdminUser[],
      total: count ?? 0
    };
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
}