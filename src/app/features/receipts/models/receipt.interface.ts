export interface Receipt {
  id: string;
  transaction_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}