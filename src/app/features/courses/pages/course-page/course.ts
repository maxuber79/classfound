import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop'; // Opcional para convertir Observable a Signal

//Servicios
import { CourseService } from '../../services/course.service';
import { SchoolsService } from '../../../schools/services/school.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LocationService } from '../../../../core/services/location.service';

//Interfaces
import { Course, CourseFormPayload } from '../../models/course.interface';
import { School } from '../../../schools/models/school.interface';

declare var bootstrap: any;
const DEBUG = true;

export interface ComunaChile {
  nombre: string;
  region: string;
}

@Component({
  selector: 'app-course-page',
	standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './course.html',
  styleUrl: './course.scss',
})
export class CoursePage implements OnInit {

	// ─── Injects/Signals ───────────────────────────────────────────────────────────────────
	private readonly coursesService = inject(CourseService);
  private readonly schoolsService = inject(SchoolsService);
  private readonly fb             = inject(FormBuilder);
  private readonly toastService   = inject(ToastService);

	// ─── Estado ───────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly updatingStatus = signal(false);

  errorMessage: string = '';
	readonly availableYears: number[] = this.generateYears();	
	// ─── Datos ────────────────────────────────────────────────────────────────────
  protected allCourses: Course[] = [];
  protected allSchools: School[] = [];

  // ─── Formulario ───────────────────────────────────────────────────────────────
  courseForm!: FormGroup;
	// ─── Modal ────────────────────────────────────────────────────────────────────
  selectedCourse: Course | null = null;
  modalMode: 'create' | 'edit' | 'view' = 'create';

  // ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedSchoolFilter: string = '';
  selectedYearFilter: string = '';

  // ─── Paginación ───────────────────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 5;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

	private locationService = inject(LocationService);
	// Signals de estado
  public allComunas = signal<ComunaChile[]>([]); 

	constructor() {
     
  }
	 // ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización.
   * Carga formulario, colegios y cursos.
   *
   * @returns {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📘 [CoursesPage][ngOnInit] Inicializando componente...');
		this.locationService.getComunas().subscribe(data => {
      this.allComunas.set(data);
      console.log('✅ Datos cargados. Total:', data.length);
    });	
    this.initForm();
    await this.loadSchools();
    await this.loadCourses();
  }
	 
	// ─── Setup ────────────────────────────────────────────────────────────────────

  /**
   * Inicializa el formulario reactivo del curso.
   */
  private initForm(): void {
    if (DEBUG) console.log('🧩 [CoursesPage][initForm] Inicializando formulario...');

    this.courseForm = this.fb.group({
      school_id:   ['', [Validators.required]],
      name:        ['', [Validators.required, Validators.maxLength(120)]],
      level:       ['', [Validators.maxLength(80)]],
      section:     ['', [Validators.maxLength(20)]],
      school_year: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2100)]],
      is_active:   [true]
    });

    if (DEBUG) console.log('✅ [CoursesPage][initForm] Formulario creado');
  }

	 // ─── Carga de datos ───────────────────────────────────────────────────────────

	 /**
 * Genera un rango de años (ej: actual ±2 años).
 *
 * @returns {number[]}
 */
generateYears(): number[] {
  const currentYear = new Date().getFullYear();

  return [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1
  ];
}

  /**
   * Obtiene todos los colegios activos/inactivos para poblar el select.
   *
   * @returns {Promise<void>}
   */
  async loadSchools(): Promise<void> {
    if (DEBUG) console.log('🏫 [CoursesPage][loadSchools] Cargando colegios...');

    try {
      this.allSchools = await this.schoolsService.getSchools();
      if (DEBUG) console.log('✅ [CoursesPage][loadSchools] Total colegios:', this.allSchools.length);
    } catch (error) {
      console.error('🔴 [CoursesPage][loadSchools] Error:', error);
      this.toastService.show('No fue posible cargar los colegios ❌', 'error');
    }
  }

  /**
   * Obtiene todos los cursos desde Supabase.
   *
   * @returns {Promise<void>}
   */
  async loadCourses(): Promise<void> {
    if (DEBUG) console.log('📚 [CoursesPage][loadCourses] Cargando cursos...');

    this.loading.set(true);
    this.errorMessage = '';

    try {
      this.allCourses = await this.coursesService.getCourses();
      if (DEBUG) console.log('✅ [CoursesPage][loadCourses] Total cursos:', this.allCourses.length);
    } catch (error) {
      console.error('🔴 [CoursesPage][loadCourses] Error:', error);
      this.errorMessage = 'No fue posible cargar los cursos.';
      this.toastService.show('Error al cargar cursos ❌', 'error');
    } finally {
      this.loading.set(false);
    }
  }

	// ─── Métricas ─────────────────────────────────────────────────────────────────

  /** Total general de cursos. */
  get totalCoursesCount(): number {
    return this.allCourses.length;
  }

  /** Total de cursos activos. */
  get activeCoursesCount(): number {
    return this.allCourses.filter(course => course.is_active).length;
  }

  /** Total de cursos inactivos. */
  get inactiveCoursesCount(): number {
    return this.allCourses.filter(course => !course.is_active).length;
  }

	/**
	 * Retorna el nombre del colegio a partir de su ID.
	 *
	 * @param {string} schoolId ID del colegio.
	 * @returns {string}
	 */
	getSchoolName(schoolId: string): string {
		const school = this.allSchools.find(s => s.id === schoolId);
		return school?.name || 'Sin colegio';
	}

	 // ─── Filtros computed ─────────────────────────────────────────────────────────

  /**
   * Lista filtrada según búsqueda, estado, colegio y año.
   *
   * @returns {Course[]}
   */
  get filteredCourses(): Course[] {
    let result = this.allCourses;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();

      result = result.filter(course =>
        course.name.toLowerCase().includes(term) ||
        course.level?.toLowerCase().includes(term) ||
        course.section?.toLowerCase().includes(term) ||
        this.getSchoolName(course.school_id).toLowerCase().includes(term) ||
        String(course.school_year).includes(term)
      );
    }

    if (this.selectedStatus === 'active') {
      result = result.filter(course => course.is_active);
    }

    if (this.selectedStatus === 'inactive') {
      result = result.filter(course => !course.is_active);
    }

    if (this.selectedSchoolFilter) {
      result = result.filter(course => course.school_id === this.selectedSchoolFilter);
    }

    if (this.selectedYearFilter) {
      result = result.filter(course => String(course.school_year) === this.selectedYearFilter);
    }

    return result;
  }

  get totalFiltered(): number { return this.filteredCourses.length; }
  get totalPages(): number { return Math.ceil(this.totalFiltered / this.pageSize); }
  get fromRecord(): number { return this.totalFiltered === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get toRecord(): number { return Math.min(this.currentPage * this.pageSize, this.totalFiltered); }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedStatus || this.selectedSchoolFilter || this.selectedYearFilter);
  }

  /**
   * Cursos de la página actual.
   *
   * @returns {Course[]}
   */
  get pagedCourses(): Course[] {
    const from = (this.currentPage - 1) * this.pageSize;
    return this.filteredCourses.slice(from, from + this.pageSize);
  }

	// ─── Handlers de filtros ──────────────────────────────────────────────────────

  /**
   * Maneja el input de búsqueda.
   */
  onSearchInput(): void {
    if (DEBUG) console.log('🔍 [CoursesPage][onSearchInput] term:', this.searchTerm);
    this.currentPage = 1;
  }

  /**
   * Maneja el cambio del filtro de estado.
   */
  onStatusFilterChange(): void {
    if (DEBUG) console.log('🔘 [CoursesPage][onStatusFilterChange] estado:', this.selectedStatus);
    this.currentPage = 1;
  }

  /**
   * Maneja el cambio del filtro de colegio.
   */
  onSchoolFilterChange(): void {
    if (DEBUG) console.log('🏫 [CoursesPage][onSchoolFilterChange] school:', this.selectedSchoolFilter);
    this.currentPage = 1;
  }

  /**
   * Maneja el cambio del filtro de año.
   */
  onYearFilterChange(): void {
    if (DEBUG) console.log('📅 [CoursesPage][onYearFilterChange] year:', this.selectedYearFilter);
    this.currentPage = 1;
  }

  /**
   * Limpia todos los filtros activos.
   */
  clearFilters(): void {
    if (DEBUG) console.log('🧹 [CoursesPage][clearFilters] Limpiando filtros...');

    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedSchoolFilter = '';
    this.selectedYearFilter = '';
    this.currentPage = 1;
  }

  /**
   * Navega a una página específica.
   *
   * @param {number} page Número de página.
   */
  goToPage(page: number): void {
    if (DEBUG) console.log('📄 [CoursesPage][goToPage] página:', page);

    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  /**
   * Maneja el cambio del selector de registros por página.
   */
  onPageSizeChange(): void {
    if (DEBUG) console.log('📏 [CoursesPage][onPageSizeChange] pageSize:', this.pageSize);
    this.currentPage = 1;
  }

  // ─── Modal ────────────────────────────────────────────────────────────────────

  /**
   * Abre modal en modo creación.
   */
  openCreateModal(): void {
    if (DEBUG) console.log('➕ [CoursesPage][openCreateModal] Abriendo modal creación...');

    this.modalMode = 'create';
    this.selectedCourse = null;
    this.courseForm.enable();

    this.courseForm.reset({
      school_id: '',
      name: '',
      level: '',
      section: '',
      school_year: new Date().getFullYear(),
      is_active: true
    });

    this.openModal();
  }

  /**
   * Abre modal en modo edición.
   *
   * @param {Course} course Curso a editar.
   */
  openEditModal(course: Course): void {
    if (DEBUG) console.log('✏️ [CoursesPage][openEditModal] Curso:', course);

    this.modalMode = 'edit';
    this.selectedCourse = course;
    this.courseForm.enable();

    this.courseForm.patchValue({
      school_id: course.school_id,
      name: course.name,
      level: course.level || '',
      section: course.section || '',
      school_year: course.school_year,
      is_active: course.is_active
    });

    this.openModal();
  }

  /**
   * Abre modal en modo visualización.
   *
   * @param {Course} course Curso a visualizar.
   */
  openViewModal(course: Course): void {
    if (DEBUG) console.log('👁️ [CoursesPage][openViewModal] Curso:', course);

    this.modalMode = 'view';
    this.selectedCourse = course;

    this.courseForm.patchValue({
      school_id: course.school_id,
      name: course.name,
      level: course.level || '',
      section: course.section || '',
      school_year: course.school_year,
      is_active: course.is_active
    });

    this.courseForm.disable();
    this.openModal();
  }

  /**
   * Instancia y abre el modal Bootstrap.
   */
  private openModal(): void {
    const modalEl = document.getElementById('courseModal');

    if (!modalEl) {
      console.warn('⚠️ [CoursesPage][openModal] No se encontró #courseModal');
      return;
    }

    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }

  /**
   * Cierra el modal y resetea el estado.
   */
  closeCourseModal(): void {
    if (DEBUG) console.log('🪟 [CoursesPage][closeCourseModal] Cerrando modal...');

    const modalEl = document.getElementById('courseModal');
    if (!modalEl) return;

    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.courseForm.enable();
    this.selectedCourse = null;
    this.modalMode = 'create';
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  /**
   * Despacha el submit según el modo activo.
   *
   * @returns {Promise<void>}
   */
  async onSubmitCourse(): Promise<void> {
    if (DEBUG) console.log('🚀 [CoursesPage][onSubmitCourse] Modo:', this.modalMode);

    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      this.toastService.show('Completa los campos obligatorios ⚠️', 'warning');
      return;
    }

    if (this.modalMode === 'create') {
      await this.onSubmitCreate();
      return;
    }

    if (this.modalMode === 'edit') {
      await this.onSubmitUpdate();
      return;
    }
  }

  /**
   * Crea un nuevo curso en Supabase.
   *
   * @returns {Promise<void>}
   */
  async onSubmitCreate(): Promise<void> {
    if (DEBUG) console.log('🆕 [CoursesPage][onSubmitCreate] Creando curso...');

    this.saving.set(true);

    try {
      const raw = this.courseForm.getRawValue();

      const payload: CourseFormPayload = {
        school_id: raw.school_id,
        name: raw.name.trim(),
        level: raw.level?.trim() || null,
        section: raw.section?.trim() || null,
        school_year: Number(raw.school_year),
        is_active: !!raw.is_active
      };

      if (DEBUG) console.log('📦 [CoursesPage][onSubmitCreate] Payload:', payload);

      await this.coursesService.createCourse(payload);

      this.toastService.show('Curso creado correctamente 📚', 'success');
      this.closeCourseModal();
      await this.loadCourses();

    } catch (error) {
      console.error('🔴 [CoursesPage][onSubmitCreate] Error:', error);
      this.toastService.show('Error al crear el curso ❌', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Actualiza un curso existente en Supabase.
   *
   * @returns {Promise<void>}
   */
  async onSubmitUpdate(): Promise<void> {
    if (DEBUG) console.log('✏️ [CoursesPage][onSubmitUpdate] Actualizando curso...');

    if (!this.selectedCourse?.id) {
      this.toastService.show('No se encontró el curso seleccionado ⚠️', 'warning');
      return;
    }

    this.saving.set(true);

    try {
      const raw = this.courseForm.getRawValue();

      const payload: CourseFormPayload = {
        school_id: raw.school_id,
        name: raw.name.trim(),
        level: raw.level?.trim() || null,
        section: raw.section?.trim() || null,
        school_year: Number(raw.school_year),
        is_active: !!raw.is_active
      };

      if (DEBUG) console.log('📦 [CoursesPage][onSubmitUpdate] Payload:', payload);

      await this.coursesService.updateCourse(this.selectedCourse.id, payload);

      this.toastService.show('Curso actualizado correctamente ✏️', 'success');
      this.closeCourseModal();
      await this.loadCourses();

    } catch (error) {
      console.error('🔴 [CoursesPage][onSubmitUpdate] Error:', error);
      this.toastService.show('Error al actualizar el curso ❌', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  // ─── Toggle estado ────────────────────────────────────────────────────────────

  /**
   * Cambia el estado activo/inactivo del curso con confirmación previa.
   *
   * @param {Course} course Curso a actualizar.
   * @returns {Promise<void>}
   */
  async toggleStatus(course: Course): Promise<void> {
    if (DEBUG) console.log('🔄 [CoursesPage][toggleStatus] Curso:', course.name);

    if (course.is_active) {
      const confirmed = window.confirm(`¿Seguro que deseas inactivar el curso "${course.name}"?`);
      if (!confirmed) return;
    }

    this.updatingStatus.set(true);

    try {
      await this.coursesService.toggleCourseStatus(course.id, !course.is_active);

      this.toastService.show(
        course.is_active ? 'Curso inactivado ⛔' : 'Curso activado ✅',
        'success'
      );

      await this.loadCourses();

    } catch (error) {
      console.error('🔴 [CoursesPage][toggleStatus] Error:', error);
      this.toastService.show('Error al cambiar estado ❌', 'error');
    } finally {
      this.updatingStatus.set(false);
    }
  }
	 
	/**
	 * Ver detalle de un curso
	 * @param course Curso seleccionado
	 */
	onViewCourse(course: Course): void {
		console.log('👁 Ver curso:', course);
		// TODO: abrir modal o navegar a detalle
	}

	/**
	 * Editar curso
	 * @param course Curso seleccionado
	 */
	onEditCourse(course: Course): void {
		console.log('✏️ Editar curso:', course);
		// TODO: abrir modal con datos
	}

	/**
	 * Eliminar curso
	 * @param course Curso seleccionado
	 */
	async onDeleteCourse(course: Course): Promise<void> {
  console.log('🗑 Eliminando curso:', course);

  const confirmDelete = confirm(`¿Eliminar el curso "${course.name}"?`);
  if (!confirmDelete) return;

  try {
    await this.coursesService.deleteCourse(course.id);
		 this.toastService.show(
        course.is_active ? 'Curso eliminado ⛔' : 'Curso eliminado ✅',
        'warning'
      );
    // refrescar lista
    await this.loadCourses();

  } catch (error) {
    console.error('❌ Error al eliminar:', error);
  }
}

	

	testConsole() {
    console.log('🚀 El componente CoursePage está respondiendo correctamente.');
    alert('¡Angular y Bootstrap funcionando en Class Fund!');
  }
}
