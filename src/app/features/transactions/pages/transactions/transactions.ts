import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionsService } from '../../services/transactions.service';
import { TransactionListItem } from '../../models/transaction.interface';

const DEBUG = true;

/**
 * Página principal del módulo de transacciones.
 * Muestra el listado de movimientos registrados en el sistema.
 */
@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss'
})
export class TransactionsPage implements OnInit {
  private readonly transactionsService = inject(TransactionsService);

  readonly loading = signal(false);
  errorMessage: string = '';

  transactions: TransactionListItem[] = [];

  /**
   * Hook de inicialización del componente.
   * Carga el listado al iniciar.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [TransactionsPage][ngOnInit] Inicializando módulo de transacciones...');
    await this.loadTransactions();
  }

  /**
   * Obtiene las transacciones desde Supabase.
   * @returns {Promise<void>}
   */
  async loadTransactions(): Promise<void> {
    if (DEBUG) console.log('🔄 [TransactionsPage][loadTransactions] Cargando transacciones...');

    this.loading.set(true);
    this.errorMessage = '';

    try {
      this.transactions = await this.transactionsService.getTransactions();
      if (DEBUG) console.log('✅ [TransactionsPage][loadTransactions] Total cargado:', this.transactions.length);
    } catch (error) {
      console.error('🔴 [TransactionsPage][loadTransactions] Error:', error);
      this.errorMessage = 'No fue posible cargar las transacciones.';
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Retorna la etiqueta legible del tipo.
   * @param {string} type Tipo de transacción.
   * @returns {string}
   */
  getTypeLabel(type: string): string {
    return type === 'income' ? 'Ingreso' : 'Egreso';
  }

  /**
   * Retorna la clase CSS del badge según el tipo.
   * @param {string} type Tipo de transacción.
   * @returns {string}
   */
  getTypeBadgeClass(type: string): string {
    return type === 'income' ? 'bg-success' : 'bg-danger';
  }

  /**
   * Retorna el icono del tipo de transacción.
   * @param {string} type Tipo de transacción.
   * @returns {string}
   */
  getTypeIcon(type: string): string {
    return type === 'income' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle';
  }

  /**
   * Formatea un monto en CLP.
   * @param {number} amount Monto numérico.
   * @returns {string}
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  }
}