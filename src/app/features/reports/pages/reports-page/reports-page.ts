import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../auth/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TransactionListItem } from '../../../transactions/models/transaction.interface';
import { TransactionsService } from '../../../transactions/services/transactions.service';

interface CourseReportRow {
  courseName: string;
  schoolName: string;
  income: number;
  expense: number;
  balance: number;
  count: number;
}

interface MonthReportRow {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage implements OnInit {
  private readonly transactionsService = inject(TransactionsService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly isAdmin = this.authService.isAdmin;
  readonly courseProfile = this.authService.courseProfile;

  transactions: TransactionListItem[] = [];
  dateFrom = '';
  dateTo = '';

  async ngOnInit(): Promise<void> {
    await this.loadTransactions();
  }

  async loadTransactions(): Promise<void> {
    this.loading.set(true);

    try {
      const courseId = this.isAdmin() ? null : this.courseProfile()?.course_id ?? null;
      this.transactions = courseId
        ? await this.transactionsService.getTransactionsByCourse(courseId)
        : await this.transactionsService.getTransactions();
    } catch (error) {
      console.error('[ReportsPage] loadTransactions error:', error);
      this.toastService.show('No fue posible cargar los reportes', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  get filteredTransactions(): TransactionListItem[] {
    return this.transactions.filter(transaction => {
      if (this.dateFrom && transaction.transaction_date < this.dateFrom) return false;
      if (this.dateTo && transaction.transaction_date > this.dateTo) return false;
      return true;
    });
  }

  get totalIncome(): number {
    return this.filteredTransactions
      .filter(transaction => transaction.type === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  get totalExpense(): number {
    return this.filteredTransactions
      .filter(transaction => transaction.type === 'expense')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  get balance(): number {
    return this.totalIncome - this.totalExpense;
  }

  get incomeCount(): number {
    return this.filteredTransactions.filter(transaction => transaction.type === 'income').length;
  }

  get expenseCount(): number {
    return this.filteredTransactions.filter(transaction => transaction.type === 'expense').length;
  }

  get courseRows(): CourseReportRow[] {
    const rows = new Map<string, CourseReportRow>();

    for (const transaction of this.filteredTransactions) {
      const key = transaction.course_id || 'sin-curso';
      const current = rows.get(key) ?? {
        courseName: transaction.course_name || 'Sin curso',
        schoolName: transaction.school_name || 'Sin colegio',
        income: 0,
        expense: 0,
        balance: 0,
        count: 0,
      };

      if (transaction.type === 'income') {
        current.income += transaction.amount;
      } else {
        current.expense += transaction.amount;
      }

      current.balance = current.income - current.expense;
      current.count += 1;
      rows.set(key, current);
    }

    return Array.from(rows.values()).sort((a, b) => b.balance - a.balance).slice(0, 8);
  }

  get monthRows(): MonthReportRow[] {
    const rows = new Map<string, MonthReportRow>();

    for (const transaction of this.filteredTransactions) {
      const month = transaction.transaction_date.slice(0, 7);
      const current = rows.get(month) ?? {
        month,
        income: 0,
        expense: 0,
        balance: 0,
      };

      if (transaction.type === 'income') {
        current.income += transaction.amount;
      } else {
        current.expense += transaction.amount;
      }

      current.balance = current.income - current.expense;
      rows.set(month, current);
    }

    return Array.from(rows.values()).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  }

  clearFilters(): void {
    this.dateFrom = '';
    this.dateTo = '';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatMonth(month: string): string {
    const [year, monthIndex] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CL', {
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, monthIndex - 1, 1));
  }
}
