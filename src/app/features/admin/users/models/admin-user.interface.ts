/**
 * Representa un usuario administrable dentro del sistema.
 * Esta interfaz se alimenta principalmente desde la tabla `profiles`
 * con join a course_members, courses y schools.
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
  // Datos de asignación de curso
  course_id?: string | null;
  course_role?: string | null;
  course_name?: string | null;
  school_id?: string | null;
  school_name?: string | null;
}