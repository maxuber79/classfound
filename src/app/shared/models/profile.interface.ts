export type GlobalRole = 'super_admin' | 'admin_colegio' | 'tesorero' | 'apoderado';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  global_role: GlobalRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}