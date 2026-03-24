import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Profile, UpdateProfilePayload } from '../models/profile.interface';

const DEBUG = true;

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private readonly supabaseService = inject(SupabaseService);

  /**
   * Obtiene el perfil del usuario autenticado actual.
   *
   * Usa auth.getUser() para obtener el ID del usuario de forma segura
   * (llamada al servidor Auth, no desde la sesión local).
   *
   * @returns {Promise<Profile>} Perfil del usuario autenticado.
   * @throws {Error} Si no hay usuario autenticado o falla la consulta.
   */
  async getProfile(): Promise<Profile> {
    if (DEBUG) console.log('👤 [ProfileService][getProfile] Obteniendo perfil...');

    const { data: authData, error: authError } = await this.supabaseService.client.auth.getUser();

    if (authError || !authData.user) {
      console.error('🔴 [ProfileService][getProfile] Error al obtener usuario auth:', authError);
      throw new Error(authError?.message ?? 'No se pudo obtener el usuario autenticado.');
    }

    const userId = authData.user.id;
    if (DEBUG) console.log('🔑 [ProfileService][getProfile] userId:', userId);

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('id, email, full_name, first_name, last_name, phone, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (DEBUG) console.log('📥 [ProfileService][getProfile] Respuesta Supabase:', { data, error });

    if (error) {
      console.error('🔴 [ProfileService][getProfile] Error al obtener perfil:', error.message);
      throw new Error(error.message);
    }

    if (DEBUG) console.log('🟢 [ProfileService][getProfile] Perfil obtenido:', data);
    return data as Profile;
  }

  /**
   * Actualiza los campos editables del perfil del usuario autenticado.
   *
   * El campo updated_at se actualiza automáticamente via trigger en Supabase.
   *
   * @param {UpdateProfilePayload} payload Datos a actualizar.
   * @returns {Promise<void>}
   * @throws {Error} Si no hay usuario autenticado o falla la actualización.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<void> {
    if (DEBUG) console.log('✏️ [ProfileService][updateProfile] Payload:', payload);

    const { data: authData, error: authError } = await this.supabaseService.client.auth.getUser();

    if (authError || !authData.user) {
      console.error('🔴 [ProfileService][updateProfile] Error al obtener usuario auth:', authError);
      throw new Error(authError?.message ?? 'No se pudo obtener el usuario autenticado.');
    }

    const userId = authData.user.id;
    if (DEBUG) console.log('🔑 [ProfileService][updateProfile] userId:', userId);

    const { error } = await this.supabaseService.client
      .from('profiles')
      .update({
        full_name:  payload.full_name,
        first_name: payload.first_name,
        last_name:  payload.last_name,
        phone:      payload.phone,
        avatar_url: payload.avatar_url,
      })
      .eq('id', userId);

    if (error) {
      console.error('🔴 [ProfileService][updateProfile] Error al actualizar:', error.message);
      throw new Error(error.message);
    }

    if (DEBUG) console.log('✅ [ProfileService][updateProfile] Perfil actualizado correctamente');
  }

  /**
   * Crea o actualiza el perfil del usuario autenticado.
   *
   * Se usa principalmente al registrarse o en el primer login,
   * cuando la fila en profiles puede no existir todavía.
   *
   * @param {Partial<UpdateProfilePayload>} payload Datos iniciales del perfil.
   * @returns {Promise<void>}
   * @throws {Error} Si no hay usuario autenticado o falla el upsert.
   */
  async upsertProfile(payload: Partial<UpdateProfilePayload> = {}): Promise<void> {
    if (DEBUG) console.log('🔄 [ProfileService][upsertProfile] Iniciando upsert...');

    const { data: authData, error: authError } = await this.supabaseService.client.auth.getUser();

    if (authError || !authData.user) {
      console.error('🔴 [ProfileService][upsertProfile] Error al obtener usuario auth:', authError);
      throw new Error(authError?.message ?? 'No se pudo obtener el usuario autenticado.');
    }

    const user = authData.user;
    if (DEBUG) console.log('🔑 [ProfileService][upsertProfile] userId:', user.id);

    const { error } = await this.supabaseService.client
      .from('profiles')
      .upsert({
        id:         user.id,
        email:      user.email,
        full_name:  payload.full_name  ?? '',
        first_name: payload.first_name ?? null,
        last_name:  payload.last_name  ?? null,
        phone:      payload.phone      ?? null,
        avatar_url: payload.avatar_url ?? null,
      }, { onConflict: 'id' });

    if (error) {
      console.error('🔴 [ProfileService][upsertProfile] Error en upsert:', error.message);
      throw new Error(error.message);
    }

    if (DEBUG) console.log('✅ [ProfileService][upsertProfile] Upsert completado');
  }
}