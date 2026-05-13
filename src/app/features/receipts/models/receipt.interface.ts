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

export interface ReceiptListItem extends Receipt {
  transaction_type: 'income' | 'expense';
  transaction_amount: number;
  transaction_description: string | null;
  transaction_date: string;
  course_id: string;
  course_name: string;
  school_name: string;
  school_year: number | null;
  category_name: string;
}
