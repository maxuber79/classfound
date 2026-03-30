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
}