import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Course, CourseFormPayload } from '../models/course.interface';

const DEBUG = true;

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

	/**
   * Obtiene el listado completo de cursos desde Supabase.
   *
   * Incluye además la relación con el colegio para poder mostrar
   * el nombre del establecimiento en listados o tablas si se requiere.
   *
   * @returns {Promise<Course[]>} Lista de cursos ordenada por año escolar descendente y fecha de creación descendente.
   * @throws {Error} Si falla la consulta.
   */
  async getCourses(): Promise<Course[]> {
    if (DEBUG) console.log('📚 [CoursesService][getCourses] Consultando cursos...');

    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        schools (
          id,
          name
        )
      `)
      .order('school_year', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [CoursesService][getCourses] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CoursesService][getCourses] Total cursos:', data?.length ?? 0);

    return (data ?? []) as Course[];
  }

  /**
   * Obtiene los cursos asociados a un colegio específico.
   *
   * @param {string} schoolId ID del colegio.
   * @returns {Promise<Course[]>} Lista de cursos del colegio indicado.
   * @throws {Error} Si falla la consulta.
   */
  async getCoursesBySchool(schoolId: string): Promise<Course[]> {
    if (DEBUG) {
      console.log('🏫 [CoursesService][getCoursesBySchool] Consultando cursos por colegio...');
      console.log('🆔 [CoursesService][getCoursesBySchool] schoolId:', schoolId);
    }

    const { data, error } = await this.supabase
      .from('courses')
      .select(`
        *,
        schools (
          id,
          name
        )
      `)
      .eq('school_id', schoolId)
      .order('school_year', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('🔴 [CoursesService][getCoursesBySchool] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CoursesService][getCoursesBySchool] Total cursos:', data?.length ?? 0);

    return (data ?? []) as Course[];
  }

  /**
   * Crea un nuevo curso en Supabase.
   *
   * @param {CourseFormPayload} payload Datos del curso a crear.
   * @returns {Promise<Course>} Curso creado.
   * @throws {Error} Si falla la inserción.
   */
  async createCourse(payload: CourseFormPayload): Promise<Course> {
    if (DEBUG) console.log('🆕 [CoursesService][createCourse] Payload:', payload);

    const { data, error } = await this.supabase
      .from('courses')
      .insert({
        school_id: payload.school_id,
        name: payload.name,
        level: payload.level,
        section: payload.section,
        school_year: payload.school_year,
        is_active: payload.is_active
      })
      .select(`
        *,
        schools (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('🔴 [CoursesService][createCourse] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CoursesService][createCourse] Curso creado:', data);

    return data as Course;
  }

  /**
   * Actualiza un curso existente en Supabase.
   *
   * @param {string} courseId ID del curso a actualizar.
   * @param {Partial<CourseFormPayload>} payload Datos a actualizar.
   * @returns {Promise<Course>} Curso actualizado.
   * @throws {Error} Si falla la actualización.
   */
  async updateCourse(
    courseId: string,
    payload: Partial<CourseFormPayload>
  ): Promise<Course> {
    if (DEBUG) {
      console.log('✏️ [CoursesService][updateCourse] courseId:', courseId);
      console.log('📦 [CoursesService][updateCourse] Payload:', payload);
    }

    const { data, error } = await this.supabase
      .from('courses')
      .update({
        school_id: payload.school_id,
        name: payload.name,
        level: payload.level,
        section: payload.section,
        school_year: payload.school_year,
        is_active: payload.is_active
      })
      .eq('id', courseId)
      .select(`
        *,
        schools (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('🔴 [CoursesService][updateCourse] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CoursesService][updateCourse] Curso actualizado:', data);

    return data as Course;
  }

  /**
   * Cambia el estado activo/inactivo de un curso.
   *
   * @param {string} courseId ID del curso.
   * @param {boolean} isActive Nuevo estado.
   * @returns {Promise<Course>} Curso actualizado.
   * @throws {Error} Si falla la actualización.
   */
  async toggleCourseStatus(courseId: string, isActive: boolean): Promise<Course> {
    if (DEBUG) {
      console.log('🔄 [CoursesService][toggleCourseStatus] courseId:', courseId);
      console.log('🔄 [CoursesService][toggleCourseStatus] Nuevo estado:', isActive);
    }

    const { data, error } = await this.supabase
      .from('courses')
      .update({ is_active: isActive })
      .eq('id', courseId)
      .select(`
        *,
        schools (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('🔴 [CoursesService][toggleCourseStatus] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CoursesService][toggleCourseStatus] Estado actualizado:', data);

    return data as Course;
  }

  /**
   * Elimina un curso desde Supabase.
   *
   * Ojo: úsalo solo si realmente quieres borrado físico.
   * Si prefieres mantener trazabilidad, conviene seguir usando is_active.
   *
   * @param {string} courseId ID del curso a eliminar.
   * @returns {Promise<void>}
   * @throws {Error} Si falla la eliminación.
   */
  async deleteCourse(courseId: string): Promise<void> {
    if (DEBUG) console.log('🗑️ [CoursesService][deleteCourse] courseId:', courseId);

    const { error } = await this.supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('🔴 [CoursesService][deleteCourse] Error:', error);
      throw error;
    }

    if (DEBUG) console.log('✅ [CoursesService][deleteCourse] Curso eliminado correctamente');
  }

	
}
