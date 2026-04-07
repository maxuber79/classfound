import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from '../../../../auth/services/auth.service';
import { DashboardService, AdminStats, CourseStats } from '../../services/dashboard.service';

/** Variable global para habilitar/deshabilitar logs de depuración */
const DEBUG = true;

@Component({
  selector: 'app-dashboard-home',
	standalone: true,
  imports: [],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  private readonly authService      = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  /** Signal que indica si los widgets están cargando */
  readonly loading = signal<boolean>(true);

  /** Signal con estadísticas globales para admin */
  readonly adminStats = signal<AdminStats | null>(null);

  /** Signal con estadísticas contextuales del curso */
  readonly courseStats = signal<CourseStats | null>(null);

  /** Computed que indica si el usuario es admin */
  readonly isAdmin = computed(() => this.authService.isAdmin());

  /** Computed que indica si el usuario es contextual (miembro de curso) */
  readonly isCourseUser = computed(() => this.authService.isCourseUser());

  /** Computed que expone el courseProfile del usuario */
  readonly courseProfile = computed(() => this.authService.courseProfile());

  /** Flag interno para evitar cargar stats más de una vez */
  private _statsLoaded = false;

  constructor() {
    if (DEBUG) console.log('🏠 [DashboardHome] Init');

    /**
     * Effect que reacciona cuando el perfil o courseProfile cambian.
     * Carga las estadísticas correctas según el rol del usuario.
     */
    effect(() => {
      const isAdmin     = this.isAdmin();
      const isCourse    = this.isCourseUser();
      const courseProf  = this.courseProfile();

      if (DEBUG) console.log('[DashboardHome][effect] isAdmin:', isAdmin, '| isCourseUser:', isCourse, '| courseProfile:', courseProf);

      // Evitar cargas duplicadas
      if (this._statsLoaded) return;

      if (isAdmin) {
        this._statsLoaded = true;
        this._loadAdminStats();
      } else if (isCourse && courseProf?.course_id) {
        this._statsLoaded = true;
        this._loadCourseStats(courseProf.course_id);
      }
    });
  }

  /**
   * Carga las estadísticas globales del sistema para el rol admin.
   * @returns {Promise<void>}
   */
  private async _loadAdminStats(): Promise<void> {
    if (DEBUG) console.log('[DashboardHome][_loadAdminStats] Cargando...');
    this.loading.set(true);
    try {
      const stats = await this.dashboardService.getAdminStats();
      this.adminStats.set(stats);
      if (DEBUG) console.log('[DashboardHome][_loadAdminStats] Stats cargadas:', stats);
    } catch (error) {
      console.error('[DashboardHome][_loadAdminStats] Error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Carga las estadísticas del curso para el usuario contextual.
   * @param {string} courseId ID del curso a consultar.
   * @returns {Promise<void>}
   */
  private async _loadCourseStats(courseId: string): Promise<void> {
    if (DEBUG) console.log('[DashboardHome][_loadCourseStats] Cargando courseId:', courseId);
    this.loading.set(true);
    try {
      const stats = await this.dashboardService.getCourseStats(courseId);
      this.courseStats.set(stats);
      if (DEBUG) console.log('[DashboardHome][_loadCourseStats] Stats cargadas:', stats);
    } catch (error) {
      console.error('[DashboardHome][_loadCourseStats] Error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Formatea un número como moneda chilena (CLP).
   * @param {number} value Valor numérico a formatear.
   * @returns {string} Valor formateado como $ chilenos.
   */
  formatCLP(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  }
}