/**
 * Tipos posibles de categoría.
 */
export type CategoryType = 'income' | 'expense';

/**
 * Modelo de categoría.
 */
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}