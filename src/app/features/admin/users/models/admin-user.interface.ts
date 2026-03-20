/**
 * Representa un usuario administrable dentro del sistema.
 * Esta interfaz se alimenta principalmente desde la tabla `profiles`.
 */
export interface AdminUser {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  email: string;
  global_role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}