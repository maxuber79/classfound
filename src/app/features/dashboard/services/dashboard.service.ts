import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
/** Variable global para habilitar/deshabilitar logs de depuración */
const DEBUG = true;
/** Estadísticas globales para el rol admin */
export interface AdminStats {
  totalSchools: number;
  activeSchools: number;
  totalCourses: number;
  activeCourses: number;
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalAmount: number;
}

/** Estadísticas contextuales para usuario de curso */
export interface CourseStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalTransactions: number;
}
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly supabaseService = inject(SupabaseService);

	constructor() {
    if (DEBUG) console.log('📊 [DashboardService] Servicio inicializado');
  }

	/**
   * Obtiene las estadísticas globales del sistema para el rol admin.
   * Ejecuta 4 consultas en paralelo: colegios, cursos, usuarios, transacciones.
   *
   * @returns {Promise<AdminStats>} Estadísticas globales del sistema.
   */
  async getAdminStats(): Promise<AdminStats> {
    if (DEBUG) console.log('[DashboardService][getAdminStats] Cargando estadísticas admin...');

    const [schoolsRes, coursesRes, usersRes, transactionsRes] = await Promise.all([
      this.supabaseService.client
        .from('schools')
        .select('is_active'),

      this.supabaseService.client
        .from('courses')
        .select('is_active'),

      this.supabaseService.client
        .from('profiles')
        .select('is_active'),

      this.supabaseService.client
        .from('transactions')
        .select('amount, type'),
    ]);

    if (schoolsRes.error)      console.error('[DashboardService][getAdminStats] Error schools:', schoolsRes.error);
    if (coursesRes.error)      console.error('[DashboardService][getAdminStats] Error courses:', coursesRes.error);
    if (usersRes.error)        console.error('[DashboardService][getAdminStats] Error users:', usersRes.error);
    if (transactionsRes.error) console.error('[DashboardService][getAdminStats] Error transactions:', transactionsRes.error);

    const schools      = schoolsRes.data      ?? [];
    const courses      = coursesRes.data      ?? [];
    const users        = usersRes.data        ?? [];
    const transactions = transactionsRes.data ?? [];

    const stats: AdminStats = {
      totalSchools:       schools.length,
      activeSchools:      schools.filter(s => s.is_active).length,
      totalCourses:       courses.length,
      activeCourses:      courses.filter(c => c.is_active).length,
      totalUsers:         users.length,
      activeUsers:        users.filter(u => u.is_active).length,
      totalTransactions:  transactions.length,
      totalAmount:        transactions
                            .filter(t => t.type === 'income')
                            .reduce((sum, t) => sum + Number(t.amount), 0),
    };

    if (DEBUG) console.log('[DashboardService][getAdminStats] Stats calculadas:', stats);
    return stats;
  }

  /**
   * Obtiene las estadísticas de un curso específico para el usuario contextual.
   * Calcula ingresos, egresos, saldo y cantidad de transacciones del curso.
   *
   * @param {string} courseId ID del curso a consultar.
   * @returns {Promise<CourseStats>} Estadísticas del curso.
   */
  async getCourseStats(courseId: string): Promise<CourseStats> {
    if (DEBUG) console.log('[DashboardService][getCourseStats] Cargando stats del curso:', courseId);

    const { data, error } = await this.supabaseService.client
      .from('transactions')
      .select('amount, type')
      .eq('course_id', courseId);

    if (error) {
      console.error('[DashboardService][getCourseStats] Error:', error);
      return { totalIncome: 0, totalExpense: 0, balance: 0, totalTransactions: 0 };
    }

    const transactions = data ?? [];

    const totalIncome  = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const stats: CourseStats = {
      totalIncome,
      totalExpense,
      balance:           totalIncome - totalExpense,
      totalTransactions: transactions.length,
    };

    if (DEBUG) console.log('[DashboardService][getCourseStats] Stats calculadas:', stats);
    return stats;
  }
}
