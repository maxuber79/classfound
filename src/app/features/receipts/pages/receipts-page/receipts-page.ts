import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../auth/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReceiptListItem } from '../../models/receipt.interface';
import { ReceiptsService } from '../../services/receipts.service';

@Component({
  selector: 'app-receipts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receipts-page.html',
  styleUrl: './receipts-page.scss',
})
export class ReceiptsPage implements OnInit {
  private readonly receiptsService = inject(ReceiptsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly openingReceipt = signal<string | null>(null);

  receipts: ReceiptListItem[] = [];
  searchTerm = '';
  selectedType = '';

  readonly isAdmin = this.authService.isAdmin;
  readonly courseProfile = this.authService.courseProfile;

  async ngOnInit(): Promise<void> {
    await this.loadReceipts();
  }

  async loadReceipts(): Promise<void> {
    this.loading.set(true);

    try {
      const courseId = this.isAdmin() ? null : this.courseProfile()?.course_id ?? null;
      this.receipts = await this.receiptsService.getReceipts(courseId);
    } catch (error) {
      console.error('[ReceiptsPage] loadReceipts error:', error);
      this.toastService.show('No fue posible cargar los comprobantes', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  get filteredReceipts(): ReceiptListItem[] {
    let result = this.receipts;

    if (this.selectedType) {
      result = result.filter(receipt => receipt.transaction_type === this.selectedType);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(receipt =>
        receipt.file_name.toLowerCase().includes(term) ||
        receipt.course_name.toLowerCase().includes(term) ||
        receipt.school_name.toLowerCase().includes(term) ||
        receipt.category_name.toLowerCase().includes(term) ||
        (receipt.transaction_description ?? '').toLowerCase().includes(term)
      );
    }

    return result;
  }

  get totalReceipts(): number {
    return this.receipts.length;
  }

  get incomeReceipts(): number {
    return this.receipts.filter(receipt => receipt.transaction_type === 'income').length;
  }

  get expenseReceipts(): number {
    return this.receipts.filter(receipt => receipt.transaction_type === 'expense').length;
  }

  get totalAmount(): number {
    return this.receipts.reduce((total, receipt) => {
      const sign = receipt.transaction_type === 'income' ? 1 : -1;
      return total + sign * receipt.transaction_amount;
    }, 0);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = '';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatFileSize(size: number): string {
    if (size < 1024 * 1024) {
      return `${Math.max(1, Math.round(size / 1024))} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  getTypeLabel(type: string): string {
    return type === 'income' ? 'Ingreso' : 'Egreso';
  }

  getTypeIcon(type: string): string {
    return type === 'income' ? 'bi-arrow-down-circle-fill' : 'bi-arrow-up-circle-fill';
  }

  async openReceipt(receipt: ReceiptListItem): Promise<void> {
    this.openingReceipt.set(receipt.id);

    try {
      const url = await this.receiptsService.getSignedUrl(receipt.file_path);
      window.open(url, '_blank');
    } catch (error) {
      console.error('[ReceiptsPage] openReceipt error:', error);
      this.toastService.show('No fue posible abrir el comprobante', 'error');
    } finally {
      this.openingReceipt.set(null);
    }
  }
}
