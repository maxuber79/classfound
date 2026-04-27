import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Receipt } from '../models/receipt.interface';

const DEBUG = true;

@Injectable({
  providedIn: 'root',
})
export class ReceiptsService {
  private supabase = inject(SupabaseService);
  private readonly BUCKET = 'receipts';

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
