export type CourseRole = 'presidente' | 'tesorero' | 'secretario' | 'apoderado';

export interface CourseMember {
  id: string;
  course_id: string;
  user_id: string;
  role: CourseRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}