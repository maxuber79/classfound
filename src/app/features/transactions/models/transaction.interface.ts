/**
 * Tipos posibles de transacción.
 */
export type TransactionType = 'income' | 'expense';

/**
 * Modelo principal de transacción.
 */
export interface Transaction {
  id: string;
  course_id: string | null;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Modelo extendido para listado, incluyendo nombre de categoría.
 */
export interface TransactionListItem extends Transaction {
  category_name?: string;
}