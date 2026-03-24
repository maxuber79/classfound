/**
 * Representa el perfil editable del usuario autenticado.
 * Se alimenta desde la tabla `profiles` de Supabase.
 *
 * Nota: global_role e is_active no se exponen aquí porque
 * el usuario no puede editarlos desde su propio perfil.
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Payload para actualizar el perfil del usuario autenticado.
 * Solo incluye los campos editables por el propio usuario.
 */
export interface UpdateProfilePayload {
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}