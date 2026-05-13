import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Receipt, ReceiptListItem } from '../models/receipt.interface';

const DEBUG = true;

@Injectable({
  providedIn: 'root',
})
export class ReceiptsService {
  private supabase = inject(SupabaseService);
  private readonly BUCKET = 'receipts';

  async getReceipts(courseId?: string | null): Promise<ReceiptListItem[]> {
    if (DEBUG) console.log('[ReceiptsService] getReceipts', courseId);

    let query = this.supabase.client
      .from('receipts')
      .select(`
        *,
        transactions!inner (
          id,
          type,
          amount,
          description,
          transaction_date,
          course_id,
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
        )
      `)
      .order('created_at', { ascending: false });

    if (courseId) {
      query = query.eq('transactions.course_id', courseId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const transaction = item.transactions;
      const course = transaction?.courses;
      const school = Array.isArray(course?.schools)
        ? course.schools[0]
        : course?.schools;

      return {
        id: item.id,
        transaction_id: item.transaction_id,
        file_path: item.file_path,
        file_name: item.file_name,
        mime_type: item.mime_type,
        file_size: item.file_size,
        uploaded_by: item.uploaded_by,
        created_at: item.created_at,
        transaction_type: transaction?.type ?? 'income',
        transaction_amount: Number(transaction?.amount ?? 0),
        transaction_description: transaction?.description ?? null,
        transaction_date: transaction?.transaction_date ?? item.created_at,
        course_id: transaction?.course_id ?? '',
        course_name: course?.name ?? 'Sin curso',
        school_name: school?.name ?? 'Sin colegio',
        school_year: course?.school_year ?? null,
        category_name: transaction?.categories?.name ?? 'Sin categoria',
      } satisfies ReceiptListItem;
    });
  }

	/**
   * Obtiene los comprobantes de una transacción específica.
   */
  async getReceiptsByTransaction(transactionId: string): Promise<Receipt[]> {
    if (DEBUG) console.log('[ReceiptsService] getReceiptsByTransaction', transactionId);
    const { data, error } = await this.supabase.client
      .from('receipts')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Receipt[];
  }

  /**
   * Sube un archivo a Supabase Storage e inserta el registro en la tabla receipts.
   */
  /**
 * Sube un archivo a Supabase Storage e inserta el registro en la tabla receipts.
 */
async uploadReceipt(
  file: File,
  transactionId: string,
  courseId: string,
  schoolId: string,
  userId: string
): Promise<Receipt> {
  if (DEBUG) console.log('[ReceiptsService] uploadReceipt', file.name, transactionId);

  const ext = file.name.split('.').pop();
  const filePath = `${schoolId}/${courseId}/${transactionId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await this.supabase.client.storage
    .from(this.BUCKET)
    .upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data, error } = await this.supabase.client
    .from('receipts')
    .insert({
      transaction_id: transactionId,
      file_path: filePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: userId
    })
    .select()
    .single();
  if (error) throw error;
  return data as Receipt;
}

  /**
   * Elimina un comprobante de Storage y de la tabla receipts.
   */
  async deleteReceipt(receiptId: string, filePath: string): Promise<void> {
    if (DEBUG) console.log('[ReceiptsService] deleteReceipt', receiptId);
    const { error: storageError } = await this.supabase.client.storage
      .from(this.BUCKET)
      .remove([filePath]);
    if (storageError) throw storageError;

    const { error } = await this.supabase.client
      .from('receipts')
      .delete()
      .eq('id', receiptId);
    if (error) throw error;
  }

  /**
   * Genera una URL firmada temporal (60 min) para visualizar un archivo privado.
   */
  async getSignedUrl(filePath: string): Promise<string> {
    if (DEBUG) console.log('[ReceiptsService] getSignedUrl', filePath);
    const { data, error } = await this.supabase.client.storage
      .from(this.BUCKET)
      .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
}
