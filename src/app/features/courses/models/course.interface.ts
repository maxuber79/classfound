/**
 * Representa un curso dentro del sistema ClassFund.
 */
export interface Course {
  id: string;
  school_id: string;

  name: string;
  level: string | null;
  section: string | null;
  school_year: number;

  is_active: boolean;

  created_at: string;
  updated_at: string;
	schools?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Payload para creación/actualización de cursos.
 */
export interface CourseFormPayload {
  school_id: string;

  name: string;
  level?: string | null;
  section?: string | null;
  school_year: number;

  is_active: boolean;
}