import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { TransactionListItem } from '../models/transaction.interface';

const DEBUG = true;

/**
 * Servicio encargado de gestionar las operaciones del módulo de transacciones.
 */
@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

  /**
   * Obtiene el listado de transacciones junto con información de la categoría.
   * @returns {Promise<TransactionListItem[]>} Lista de transacciones.
   */
  async getTransactions(): Promise<TransactionListItem[]> {
    if (DEBUG) console.log('💸 [TransactionsService][getTransactions] Consultando transacciones...');

    const { data, error } = await this.supabase
      .from('transactions')
      .select(`
        *,
        categories (
          name
        )
      `)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('🔴 [TransactionsService][getTransactions] Error al obtener transacciones:', error);
      throw error;
    }

    const mappedData: TransactionListItem[] = (data ?? []).map((item: any) => ({
      ...item,
      category_name: item.categories?.name ?? 'Sin categoría'
    }));

    if (DEBUG) console.log('✅ [TransactionsService][getTransactions] Transacciones obtenidas:', mappedData);

    return mappedData;
  }
}