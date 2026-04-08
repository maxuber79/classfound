import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Category } from '../models/category.interface';

const DEBUG = true;

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

  /**
   * Obtiene el listado completo de categorías desde Supabase.
   * @returns {Promise<Category[]>}
   */
  async getCategories(): Promise<Category[]> {
    if (DEBUG) console.log('📂 [CategoriesService][getCategories] Consultando categorías...');

    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [CategoriesService][getCategories] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CategoriesService][getCategories] Total:', data?.length);
    return (data ?? []) as Category[];
  }

  /**
   * Obtiene solo las categorías activas desde Supabase.
   * Se usa en formularios de creación/edición de transacciones.
   *
   * @returns {Promise<Category[]>} Categorías con is_active = true.
   */
  async getActiveCategories(): Promise<Category[]> {
    if (DEBUG) console.log('📂 [CategoriesService][getActiveCategories] Consultando categorías activas...');

    const { data, error } = await this.supabase
      .from('categories')
      .select('id, name, type, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('🔴 [CategoriesService][getActiveCategories] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CategoriesService][getActiveCategories] Total activas:', data?.length);
    return (data ?? []) as Category[];
  }

  /**
   * Crea una nueva categoría en Supabase.
   * @param {Pick<Category, 'name' | 'type' | 'is_active'>} payload
   * @returns {Promise<Category>}
   */
  async createCategory(payload: Pick<Category, 'name' | 'type' | 'is_active'>): Promise<Category> {
    if (DEBUG) console.log('🆕 [CategoriesService][createCategory] Creando:', payload);

    const { data, error } = await this.supabase
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('🔴 [CategoriesService][createCategory] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CategoriesService][createCategory] Creada:', data);
    return data as Category;
  }

  /**
   * Actualiza una categoría existente.
   * @param {string} id ID de la categoría.
   * @param {Partial<Category>} payload Campos a actualizar.
   * @returns {Promise<void>}
   */
  async updateCategory(id: string, payload: Partial<Category>): Promise<void> {
    if (DEBUG) console.log('✏️ [CategoriesService][updateCategory] id:', id, '| payload:', payload);

    const { error } = await this.supabase
      .from('categories')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('🔴 [CategoriesService][updateCategory] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CategoriesService][updateCategory] Actualizada');
  }

	 /**
	 * Obtiene categorías activas para un contexto de curso:
	 * trae las globales (school_id IS NULL) más las del colegio indicado.
	 * Se usa en el modal de transacciones en modo contextual.
	 *
	 * @param {string} schoolId ID del colegio del curso activo.
	 * @returns {Promise<Category[]>} Categorías globales + las del colegio.
	 */
	async getCategoriesBySchool(schoolId: string): Promise<Category[]> {
		if (DEBUG) console.log('🏫 [CategoriesService][getCategoriesBySchool] schoolId:', schoolId);

		const { data, error } = await this.supabase
			.from('categories')
			.select(`
			id, name, type, is_active, school_id, created_at, updated_at,
			schools (
				id,
				name
			)
		`) 
			.or(`school_id.is.null,school_id.eq.${schoolId}`)
			.order('name', { ascending: true });

		if (error) {
			console.error('🔴 [CategoriesService][getCategoriesBySchool] Error:', error);
			throw error;
		}

		if (DEBUG) console.log('✅ [CategoriesService][getCategoriesBySchool] Total:', data?.length);
		return (data ?? []) as unknown as Category[];
	}

	/**
	 * Elimina una categoría por ID.
	 * Solo aplica a categorías del colegio (school_id no nulo).
	 *
	 * @param {string} id ID de la categoría a eliminar.
	 * @returns {Promise<void>}
	 */
	async deleteCategory(id: string): Promise<void> {
		if (DEBUG) console.log('🗑️ [CategoriesService][deleteCategory] id:', id);

		const { error } = await this.supabase
			.from('categories')
			.delete()
			.eq('id', id);

		if (error) {
			console.error('🔴 [CategoriesService][deleteCategory] Error:', error);
			throw error;
		}

		if (DEBUG) console.log('✅ [CategoriesService][deleteCategory] Eliminada');
	}
}