import { Injectable, signal } from '@angular/core';


const TOAST_DURATION = {
  success: 2800,
  info: 3000,
  warning: 4000,
  error: 5000
} as const;

/**
 * Modelo de Toast.
 */
export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
	closing?: boolean;
}

let toastId = 0;

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  /** Lista reactiva de toasts */
  readonly toasts = signal<ToastMessage[]>([]);

	

  /**
   * Muestra un nuevo toast en pantalla.
   *
   * @param {string} message Mensaje a mostrar.
   * @param {'success' | 'error' | 'warning' | 'info'} type Tipo de toast.
   * @param {number} duration Tiempo en ms antes de desaparecer.
   * Si duration es 0, el toast queda visible hasta cerrarlo manualmente.
   * @returns {void}
   */
 show(
  message: string,
  type: ToastMessage['type'] = 'info',
  duration?: number
): void {
  const id = ++toastId;

  const newToast: ToastMessage = { id, message, type };

  this.toasts.update(current => [...current, newToast]);

  const finalDuration = duration ?? TOAST_DURATION[type];

  if (finalDuration > 0) {
    setTimeout(() => this.remove(id), finalDuration);
  }
}

  /**
   * Elimina un toast manualmente.
   *
   * @param {number} id ID del toast.
   * @returns {void}
   */
  remove(id: number): void {
    this.toasts.update(current =>
    current.map(t =>
      t.id === id ? { ...t, closing: true } : t
    )
  );

  setTimeout(() => {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }, 300);
  }

  /**
   * Elimina todos los toast visibles.
   *
   * @returns {void}
   */
  clear(): void {
    this.toasts.set([]);
  }
}