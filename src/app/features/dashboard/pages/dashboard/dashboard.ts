import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../auth/services/auth.service';

interface NavItem {
  icon: string;
  label: string;
  active: boolean;
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
  imports: [],
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

	readonly navItems: NavItem[] = [
    { icon: 'bi-grid-1x2', label: 'Dashboard', active: true },
    { icon: 'bi-people', label: 'Usuarios', active: false },
    { icon: 'bi-bar-chart', label: 'Reportes', active: false },
    { icon: 'bi-calendar3', label: 'Calendario', active: false },
    { icon: 'bi-folder', label: 'Documentos', active: false },
    { icon: 'bi-gear', label: 'Configuración', active: false },
  ];

	readonly notifications: Notification[] = [
    { id: 1, icon: 'bi-person-plus', iconColor: 'text-primary', title: 'Nuevo usuario registrado', description: 'usuario@ejemplo.cl se unió al sistema', time: 'Hace 5 min', unread: true },
    { id: 2, icon: 'bi-file-earmark-check', iconColor: 'text-success', title: 'Reporte generado', description: 'El reporte mensual está listo', time: 'Hace 1 hora', unread: true },
    { id: 3, icon: 'bi-exclamation-triangle', iconColor: 'text-warning', title: 'Alerta del sistema', description: 'Espacio en disco al 80%', time: 'Hace 3 horas', unread: false },
  ];

	get unreadCount(): number {
    return this.notifications.filter(n => n.unread).length;
  }

  toggleSidebar(): void {
    this.sidebarExpanded.update(v => !v);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update(v => !v);
    if (this.profileOpen()) this.profileOpen.set(false);
  }

  toggleProfile(): void {
    this.profileOpen.update(v => !v);
    if (this.notificationsOpen()) this.notificationsOpen.set(false);
  }

  setActive(item: NavItem): void {
    this.navItems.forEach(n => n.active = false);
    item.active = true;
  }

  onNotificationClick(notification: Notification): void {
    console.log('🔔 Notificación clickeada:', notification);
    // TODO: abrir componente de notificaciones
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('[Dashboard] Error al cerrar sesión:', error);
    }
  }
 

   
}