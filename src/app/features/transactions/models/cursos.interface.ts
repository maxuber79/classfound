export interface TransactionCourseOption {
  id: string;
	school_id: string;
  name: string;
  level: string | null;
  section: string | null;
  school_year: number | null;
  is_active: boolean;
	schools?: {
    id: string;
    name: string;
  } | null;
}