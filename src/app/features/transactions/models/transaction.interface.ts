/**
 * Tipos posibles de transacción.
 */
export type TransactionType = 'income' | 'expense';

/**
 * Modelo principal de transacción.
 */
export interface Transaction {
  id: string;
  course_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  notes: string | null;
  transaction_date: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Modelo extendido para listado, incluyendo nombre de categoría.
 */
export interface TransactionListItem extends Transaction {
  category_name?: string;
  course_name?: string;
  school_name?: string;
  school_year?: number | null;
  school_id?: string;
  /** true si la transacción tiene al menos un comprobante adjunto. */
  has_receipt?: boolean;
}