import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Transaction, TransactionListItem } from '../models/transaction.interface';
import { TransactionCourseOption } from '../models/cursos.interface';

const DEBUG = true;

/**
 * Payload para crear una nueva transacción.
 */
export interface CreateTransactionPayload {
  course_id: string | null;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  created_by: string;
  updated_by: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

   /**
	 * Obtiene el listado de transacciones con join a categorías, cursos y colegios.
	 * Esto permite enriquecer la tabla y futuros filtros sin cambiar la BD.
	 *
	 * @returns {Promise<TransactionListItem[]>}
	 */
	async getTransactions(): Promise<TransactionListItem[]> {
		if (DEBUG) console.log('💸 [TransactionsService][getTransactions] Consultando...');

		const { data, error } = await this.supabase
    .from('transactions')
    .select(`
        *,
        categories (
            name
        ),
        courses (
            id,
            name,
            school_year,
            schools (
                id,
                name
            )
        ),
        receipts (
            id
        )
    `)
    .order('transaction_date', { ascending: false });

		if (error) {
			console.error('🔴 [TransactionsService][getTransactions] Error:', error);
			throw error;
		}

		 const mappedData: TransactionListItem[] = (data ?? []).map((item: any) => ({
    ...item,
    category_name: item.categories?.name ?? 'Sin categoría',
    course_name: item.courses?.name ?? '',
    school_name:
        Array.isArray(item.courses?.schools)
            ? item.courses.schools[0]?.name ?? ''
            : item.courses?.schools?.name ?? '',
    school_year: item.courses?.school_year ?? null,
    school_id:
        Array.isArray(item.courses?.schools)
            ? item.courses.schools[0]?.id ?? null
            : item.courses?.schools?.id ?? null,
    has_receipt: Array.isArray(item.receipts)
        ? item.receipts.length > 0
        : false
}));

		if (DEBUG) console.log('✅ [TransactionsService][getTransactions] Total:', mappedData.length);
		if (DEBUG) console.log('📦 [TransactionsService][getTransactions] Data enriquecida:', mappedData);

		return mappedData;
	}

  /**
   * Crea una nueva transacción en Supabase.
   *
   * @param {CreateTransactionPayload} payload Datos de la transacción a crear.
   * @returns {Promise<Transaction>} Transacción creada.
   * @throws {Error} Si falla la inserción.
   */
  async createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
    if (DEBUG) console.log('🆕 [TransactionsService][createTransaction] Payload:', payload);

    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        course_id:        payload.course_id,
        category_id:      payload.category_id,
        type:             payload.type,
        amount:           payload.amount,
        description:      payload.description,
        notes:            payload.notes,
        transaction_date: payload.transaction_date,
				created_by: 			payload.created_by,
        updated_by: 			payload.updated_by,
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [TransactionsService][createTransaction] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [TransactionsService][createTransaction] Creada:', data);
    return data as Transaction;
  }

	 /**
	 * Obtiene los cursos activos para el selector del formulario.
	 * Incluye el colegio relacionado para mostrar una etiqueta más clara en el modal.
	 *
	 * @returns {Promise<TransactionCourseOption[]>}
	 */
	async getActiveCourses(): Promise<TransactionCourseOption[]> {
		if (DEBUG) console.log('🏫 [TransactionsService][getActiveCourses] Consultando cursos activos...');

		const { data, error } = await this.supabase
			.from('courses')
			.select(`
				id,
				school_id,
				name,
				level,
				section,
				school_year,
				is_active,
				schools (
					id,
					name
				)
			`)
			.eq('is_active', true)
			.order('school_year', { ascending: false })
			.order('name', { ascending: true });

		if (error) {
			console.error('🔴 [TransactionsService][getActiveCourses] Error:', error);
			throw error;
		}

		if (DEBUG) console.log('✅ [TransactionsService][getActiveCourses] Cursos raw:', data);

		const normalizedCourses: TransactionCourseOption[] = (data ?? []).map((course: any) => ({
			id: course.id,
			school_id: course.school_id,
			name: course.name,
			level: course.level,
			section: course.section,
			school_year: course.school_year,
			is_active: course.is_active,
			schools: Array.isArray(course.schools) ? (course.schools[0] ?? null) : course.schools ?? null
		}));

		if (DEBUG) console.log('✅ [TransactionsService][getActiveCourses] Cursos normalizados:', normalizedCourses);

		return normalizedCourses;
	}

	/**
	 * Actualiza una transacción existente en Supabase.
	 *
	 * @param {string} transactionId ID de la transacción a actualizar.
	 * @param {Partial<CreateTransactionPayload>} payload Datos a actualizar.
	 * @returns {Promise<Transaction>} Transacción actualizada.
	 * @throws {Error} Si falla la actualización.
	 */
	async updateTransaction(
		transactionId: string,
		payload: Partial<CreateTransactionPayload>
	): Promise<Transaction> {
		if (DEBUG) {
			console.log('✏️ [TransactionsService][updateTransaction] Actualizando transacción...');
			console.log('🆔 [TransactionsService][updateTransaction] transactionId:', transactionId);
			console.log('📦 [TransactionsService][updateTransaction] payload:', payload);
		}

		const { data, error } = await this.supabase
			.from('transactions')
			.update(payload)
			.eq('id', transactionId)
			.select()
			.single();

		if (error) {
			console.error('🔴 [TransactionsService][updateTransaction] Error:', error);
			throw error;
		}

		if (DEBUG) console.log('✅ [TransactionsService][updateTransaction] Actualizada:', data);

		return data as Transaction;
	}

	/**
	 * Elimina una transacción por su ID.
	 *
	 * @param {string} transactionId ID de la transacción.
	 * @returns {Promise<void>}
	 */
	async deleteTransaction(transactionId: string): Promise<void> {
		if (DEBUG) console.log('🗑️ [TransactionsService][deleteTransaction] Eliminando:', transactionId);

		const { error } = await this.supabase
			.from('transactions')
			.delete()
			.eq('id', transactionId);

		if (error) {
			console.error('🔴 [TransactionsService][deleteTransaction] Error:', error);
			throw error;
		}

		if (DEBUG) console.log('✅ [TransactionsService][deleteTransaction] Eliminada correctamente');
	}

	/**
	 * Obtiene transacciones filtradas por curso.
	 *
	 * @param {string} courseId ID del curso.
	 * @returns {Promise<TransactionListItem[]>}
	 */
	async getTransactionsByCourse(courseId: string): Promise<TransactionListItem[]> {
		if (DEBUG) console.log('📘 [TransactionsService][getTransactionsByCourse] Consultando por curso:', courseId);

		const { data, error } = await this.supabase
			.from('transactions')
			.select(`
				*,
				categories (
					name
				),
				courses (
					id,
					name,
					school_year,
					schools (
						id,
						name
					)
				)
			`)
			.eq('course_id', courseId)
			.order('transaction_date', { ascending: false });

		if (error) {
			console.error('🔴 [TransactionsService][getTransactionsByCourse] Error:', error);
			throw error;
		}

		const mappedData: TransactionListItem[] = (data ?? []).map((item: any) => ({
			...item,
			category_name: item.categories?.name ?? 'Sin categoría',
			course_name: item.courses?.name ?? '',
			school_name:
				Array.isArray(item.courses?.schools)
					? item.courses.schools[0]?.name ?? ''
					: item.courses?.schools?.name ?? '',
			school_year: item.courses?.school_year ?? null,
			school_id:
				Array.isArray(item.courses?.schools)
					? item.courses.schools[0]?.id ?? ''
					: item.courses?.schools?.id ?? '',
			has_receipt: Array.isArray(item.receipts)
			? item.receipts.length > 0
			: false
		}));

		if (DEBUG) console.log('✅ [TransactionsService][getTransactionsByCourse] Total:', mappedData.length);
		if (DEBUG) console.log('📦 [TransactionsService][getTransactionsByCourse] Data enriquecida:', mappedData);

		return mappedData;
	}
}