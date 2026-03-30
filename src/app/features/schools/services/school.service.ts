import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { School, SchoolFormPayload } from '../models/school.interface';

const DEBUG = true;

@Injectable({
  providedIn: 'root'
})
export class SchoolsService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

  /**
   * Obtiene el listado completo de colegios desde Supabase.
   *
   * @returns {Promise<School[]>} Lista de colegios ordenada por fecha de creación descendente.
   * @throws {Error} Si falla la consulta.
   */
  async getSchools(): Promise<School[]> {
    if (DEBUG) console.log('🏫 [SchoolsService][getSchools] Consultando colegios...');

    const { data, error } = await this.supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [SchoolsService][getSchools] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [SchoolsService][getSchools] Total colegios:', data?.length ?? 0);

    return (data ?? []) as School[];
  }

  /**
   * Crea un nuevo colegio en Supabase.
   *
   * @param {SchoolFormPayload} payload Datos del colegio a crear.
   * @returns {Promise<School>} Colegio creado.
   * @throws {Error} Si falla la inserción.
   */
  async createSchool(payload: SchoolFormPayload): Promise<School> {
    if (DEBUG) console.log('🆕 [SchoolsService][createSchool] Payload:', payload);

    const { data, error } = await this.supabase
      .from('schools')
      .insert({
        name: payload.name,
        commune: payload.commune,
        region: payload.region,
        is_active: payload.is_active
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [SchoolsService][createSchool] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [SchoolsService][createSchool] Colegio creado:', data);

    return data as School;
  }

  /**
   * Actualiza un colegio existente en Supabase.
   *
   * @param {string} schoolId ID del colegio a actualizar.
   * @param {Partial<SchoolFormPayload>} payload Datos a actualizar.
   * @returns {Promise<School>} Colegio actualizado.
   * @throws {Error} Si falla la actualización.
   */
  async updateSchool(
    schoolId: string,
    payload: Partial<SchoolFormPayload>
  ): Promise<School> {
    if (DEBUG) {
      console.log('✏️ [SchoolsService][updateSchool] schoolId:', schoolId);
      console.log('📦 [SchoolsService][updateSchool] Payload:', payload);
    }

    const { data, error } = await this.supabase
      .from('schools')
      .update({
        name: payload.name,
        commune: payload.commune,
        region: payload.region,
        is_active: payload.is_active
      })
      .eq('id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('🔴 [SchoolsService][updateSchool] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [SchoolsService][updateSchool] Colegio actualizado:', data);

    return data as School;
  }

  /**
   * Cambia el estado activo/inactivo de un colegio.
   *
   * @param {string} schoolId ID del colegio.
   * @param {boolean} isActive Nuevo estado.
   * @returns {Promise<School>} Colegio actualizado.
   * @throws {Error} Si falla la actualización.
   */
  async toggleSchoolStatus(schoolId: string, isActive: boolean): Promise<School> {
    if (DEBUG) {
      console.log('🔄 [SchoolsService][toggleSchoolStatus] schoolId:', schoolId);
      console.log('🔄 [SchoolsService][toggleSchoolStatus] Nuevo estado:', isActive);
    }

    const { data, error } = await this.supabase
      .from('schools')
      .update({ is_active: isActive })
      .eq('id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('🔴 [SchoolsService][toggleSchoolStatus] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [SchoolsService][toggleSchoolStatus] Estado actualizado:', data);

    return data as School;
  }
}