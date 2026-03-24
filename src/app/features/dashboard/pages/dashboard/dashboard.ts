import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../auth/services/auth.service';

const DEBUG = true;

interface NavItem {
  icon: string;
  label: string;
  route: string; // Ruta hija relativa al dashboard
}

interface Notification {
  id: number;
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userEmail = this.authService.userEmail;
  readonly sidebarExpanded = signal(true);
  readonly notificationsOpen = signal(false);
  readonly profileOpen = signal(false);

  /**
   * Items del sidebar con su ruta hija correspondiente.
   * La propiedad `route` es relativa a /dashboard/.
   */
  readonly navItems: NavItem[] = [
    { icon: 'bi-grid-1x2',   label: 'Dashboard',     route: 'home'         },
    { icon: 'bi-people',     label: 'Usuarios',       route: 'admin/users'  },
    { icon: 'bi-bar-chart',  label: 'Reportes',       route: 'reportes'     },
    { icon: 'bi-calendar3',  label: 'Calendario',     route: 'calendario'   },
    { icon: 'bi-folder',     label: 'Documentos',     route: 'documentos'   },
    { icon: 'bi-gear',       label: 'Configuración',  route: 'configuracion'},
  ];

  readonly notifications: Notification[] = [
    { id: 1, icon: 'bi-person-plus',         iconColor: 'text-primary', title: 'Nuevo usuario registrado',  description: 'usuario@ejemplo.cl se unió al sistema', time: 'Hace 5 min',   unread: true  },
    { id: 2, icon: 'bi-file-earmark-check',  iconColor: 'text-success', title: 'Reporte generado',          description: 'El reporte mensual está listo',         time: 'Hace 1 hora',  unread: true  },
    { id: 3, icon: 'bi-exclamation-triangle',iconColor: 'text-warning', title: 'Alerta del sistema',        description: 'Espacio en disco al 80%',               time: 'Hace 3 horas', unread: false },
  ];

  /**
   * Retorna el total de notificaciones no leídas.
   * @returns {number}
   */
  get unreadCount(): number {
    return this.notifications.filter(n => n.unread).length;
  }

  /**
   * Alterna el estado expandido/colapsado del sidebar.
   */
  toggleSidebar(): void {
    if (DEBUG) console.log('🗂️ [Dashboard][toggleSidebar] Sidebar:', !this.sidebarExpanded());
    this.sidebarExpanded.update(v => !v);
  }

  /**
   * Alterna el panel de notificaciones y cierra el de perfil si está abierto.
   */
  toggleNotifications(): void {
    if (DEBUG) console.log('🔔 [Dashboard][toggleNotifications]');
    this.notificationsOpen.update(v => !v);
    if (this.profileOpen()) this.profileOpen.set(false);
  }

  /**
   * Alterna el panel de perfil y cierra el de notificaciones si está abierto.
   */
  toggleProfile(): void {
    if (DEBUG) console.log('👤 [Dashboard][toggleProfile]');
    this.profileOpen.update(v => !v);
    if (this.notificationsOpen()) this.notificationsOpen.set(false);
  }

  /**
   * Verifica si la ruta hija está activa comparando con la URL actual.
   * Se usa para marcar visualmente el item del sidebar correspondiente.
   * @param {string} route Ruta hija relativa (ej: 'admin/users').
   * @returns {boolean}
   */
  isRouteActive(route: string): boolean {
    return this.router.url.includes(`/dashboard/${route}`);
  }

  /**
   * Navega a la ruta hija correspondiente al item del sidebar seleccionado.
   * @param {NavItem} item Item del menú clickeado.
   */
  navigateTo(item: NavItem): void {
    if (DEBUG) console.log('🧭 [Dashboard][navigateTo] Navegando a:', item.route);
    this.router.navigate(['/dashboard', item.route]);
  }

  /**
   * Maneja el click en una notificación.
   * @param {Notification} notification Notificación seleccionada.
   */
  onNotificationClick(notification: Notification): void {
    if (DEBUG) console.log('🔔 [Dashboard][onNotificationClick]', notification);
    // TODO: abrir componente de notificaciones
  }

  /**
   * Cierra la sesión del usuario y redirige al login.
   */
  async signOut(): Promise<void> {
    if (DEBUG) console.log('🚪 [Dashboard][signOut] Cerrando sesión...');
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('🔴 [Dashboard][signOut] Error:', error);
    }
  }
}
