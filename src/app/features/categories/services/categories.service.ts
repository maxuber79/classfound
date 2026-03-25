import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Category } from '../models/category.interface';

const DEBUG = true;

/**
 * Servicio encargado de gestionar las operaciones CRUD de categorías
 * contra Supabase.
 */
@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

  /**
   * Obtiene el listado completo de categorías desde Supabase.
   * @returns {Promise<Category[]>} Arreglo de categorías.
   */
  async getCategories(): Promise<Category[]> {
    if (DEBUG) console.log('📂 [CategoriesService][getCategories] Consultando categorías...');

    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [CategoriesService][getCategories] Error al obtener categorías:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CategoriesService][getCategories] Categorías obtenidas:', data);

    return (data ?? []) as Category[];
  }

	  /**
   * Crea una nueva categoría en Supabase.
   * @param {Pick<Category, 'name' | 'type' | 'is_active'>} payload Datos de la categoría a crear.
   * @returns {Promise<Category>} Categoría creada.
   */
  async createCategory(payload: Pick<Category, 'name' | 'type' | 'is_active'>): Promise<Category> {
    if (DEBUG) console.log('🆕 [CategoriesService][createCategory] Creando categoría...', payload);

    const { data, error } = await this.supabase
      .from('categories')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('🔴 [CategoriesService][createCategory] Error al crear categoría:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CategoriesService][createCategory] Categoría creada:', data);

    return data as Category;
  }

	async updateCategory(id: string, data: any) {
		const { error } = await this.supabase
			.from('categories')
			.update(data)
			.eq('id', id);

		if (error) throw error;
	}
}