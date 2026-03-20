/**
 * Payload utilizado para la creación administrativa de usuarios.
 *
 * Este modelo representa la información mínima necesaria
 * para crear un usuario del sistema desde el módulo de administración.
 */
export interface CreateAdminUserPayload {
  email: string;
  password: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  global_role: string;
  is_active?: boolean;
  course_id?: string | null;
  course_role?: string | null;
}