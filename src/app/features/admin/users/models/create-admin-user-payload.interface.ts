/**
 * Payload utilizado para la creación administrativa de usuarios.
 *
 * Este modelo representa la información mínima necesaria
 * para crear un usuario del sistema desde el módulo de administración.
 */
export interface CreateAdminUserPayload {
  full_name: string;
  email: string;
  password: string;
  global_role: string;
  is_active: boolean;
}