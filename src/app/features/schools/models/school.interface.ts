
/**
 * Modelo principal de colegio.
 */
export interface School {
  id: string;
  name: string;
  commune: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Payload base para crear o actualizar un colegio.
 */
export interface SchoolFormPayload {
  name: string;
  commune: string | null;
  region: string | null;
  is_active: boolean;
}