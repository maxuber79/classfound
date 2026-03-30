import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { SchoolsService } from '../../services/school.service';
import { ToastService } from '../../../../core/services/toast.service';
import { School, SchoolFormPayload } from '../../models/school.interface';

declare var bootstrap: any;
const DEBUG = true;

@Component({
  selector: 'app-schools',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './schools.html',
  styleUrl: './schools.scss',
})
export class SchoolsPage implements OnInit {

  private readonly schoolsService = inject(SchoolsService);
  private readonly fb              = inject(FormBuilder);
  private readonly toastService    = inject(ToastService);

  // ─── Estado ───────────────────────────────────────────────────────────────────
  readonly loading       = signal(false);
  readonly saving        = signal(false);
  readonly updatingStatus = signal(false);
  errorMessage: string   = '';

  // ─── Datos ────────────────────────────────────────────────────────────────────
  protected allSchools: School[] = [];

  // ─── Formulario ───────────────────────────────────────────────────────────────
  schoolForm!: FormGroup;

  // ─── Modal ────────────────────────────────────────────────────────────────────
  selectedSchool: School | null        = null;
  modalMode: 'create' | 'edit' | 'view' = 'create';

  // ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm: string     = '';
  selectedStatus: string = '';

  // ─── Paginación ───────────────────────────────────────────────────────────────
  currentPage: number    = 1;
  pageSize: number       = 5;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización. Construye el formulario y carga el listado.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [SchoolsPage][ngOnInit] Inicializando...');
    this.initForm();
    await this.loadSchools();
  }

  // ─── Setup ────────────────────────────────────────────────────────────────────

  /**
   * Inicializa el formulario reactivo del colegio.
   */
  private initForm(): void {
    if (DEBUG) console.log('🧩 [SchoolsPage][initForm] Inicializando formulario...');

    this.schoolForm = this.fb.group({
      name:      ['', [Validators.required, Validators.maxLength(120)]],
      commune:   ['', [Validators.maxLength(120)]],
      region:    ['', [Validators.maxLength(120)]],
      is_active: [true]
    });

    if (DEBUG) console.log('✅ [SchoolsPage][initForm] Formulario creado');
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────────

  /**
   * Obtiene todos los colegios desde Supabase.
   * @returns {Promise<void>}
   */
  async loadSchools(): Promise<void> {
    if (DEBUG) console.log('🔄 [SchoolsPage][loadSchools] Cargando colegios...');

    this.loading.set(true);
    this.errorMessage = '';

    try {
      this.allSchools = await this.schoolsService.getSchools();
      if (DEBUG) console.log('✅ [SchoolsPage][loadSchools] Total:', this.allSchools.length);
    } catch (error) {
      console.error('🔴 [SchoolsPage][loadSchools] Error:', error);
      this.errorMessage = 'No fue posible cargar los colegios.';
      this.toastService.show('Error al cargar colegios ❌', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Métricas ─────────────────────────────────────────────────────────────────

  /** Total general de colegios. */
  get totalSchoolsCount(): number {
    return this.allSchools.length;
  }

  /** Total de colegios activos. */
  get activeSchoolsCount(): number {
    return this.allSchools.filter(s => s.is_active).length;
  }

  /** Total de colegios inactivos. */
  get inactiveSchoolsCount(): number {
    return this.allSchools.filter(s => !s.is_active).length;
  }

  // ─── Filtros computed ─────────────────────────────────────────────────────────

  /**
   * Lista filtrada según búsqueda por nombre, comuna, región y estado.
   * @returns {School[]}
   */
  get filteredSchools(): School[] {
    let result = this.allSchools;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.commune?.toLowerCase().includes(term) ||
        s.region?.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus === 'active')   result = result.filter(s => s.is_active);
    if (this.selectedStatus === 'inactive') result = result.filter(s => !s.is_active);

    return result;
  }

  get totalFiltered(): number  { return this.filteredSchools.length; }
  get totalPages(): number     { return Math.ceil(this.totalFiltered / this.pageSize); }
  get fromRecord(): number     { return this.totalFiltered === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get toRecord(): number       { return Math.min(this.currentPage * this.pageSize, this.totalFiltered); }
  get pages(): number[]        { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get hasActiveFilters(): boolean { return !!(this.searchTerm || this.selectedStatus); }

  /** Colegios de la página actual. */
  get pagedSchools(): School[] {
    const from = (this.currentPage - 1) * this.pageSize;
    return this.filteredSchools.slice(from, from + this.pageSize);
  }

  // ─── Handlers de filtros ──────────────────────────────────────────────────────

  /**
   * Maneja el input de búsqueda. Resetea a página 1.
   */
  onSearchInput(): void {
    if (DEBUG) console.log('🔍 [SchoolsPage][onSearchInput] term:', this.searchTerm);
    this.currentPage = 1;
  }

  /**
   * Maneja el cambio del filtro de estado. Resetea a página 1.
   */
  onStatusFilterChange(): void {
    if (DEBUG) console.log('🔘 [SchoolsPage][onStatusFilterChange] estado:', this.selectedStatus);
    this.currentPage = 1;
  }

  /**
   * Limpia todos los filtros activos y vuelve a la página 1.
   */
  clearFilters(): void {
    if (DEBUG) console.log('🧹 [SchoolsPage][clearFilters] Limpiando filtros...');
    this.searchTerm     = '';
    this.selectedStatus = '';
    this.currentPage    = 1;
  }

  /**
   * Navega a una página específica.
   * @param {number} page Número de página destino.
   */
  goToPage(page: number): void {
    if (DEBUG) console.log('📄 [SchoolsPage][goToPage] página:', page);
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  /**
   * Maneja el cambio del selector de registros por página.
   */
  onPageSizeChange(): void {
    if (DEBUG) console.log('📏 [SchoolsPage][onPageSizeChange] pageSize:', this.pageSize);
    this.currentPage = 1;
  }

  // ─── Modal ────────────────────────────────────────────────────────────────────

  /**
   * Abre el modal en modo creación y resetea el formulario.
   */
  openCreateModal(): void {
    if (DEBUG) console.log('➕ [SchoolsPage][openCreateModal] Abriendo modal creación...');

    this.modalMode = 'create';
    this.selectedSchool = null;
    this.schoolForm.enable();
    this.schoolForm.reset({ name: '', commune: '', region: '', is_active: true });

    this.openModal();
  }

  /**
   * Abre el modal en modo edición con los datos del colegio seleccionado.
   * @param {School} school Colegio a editar.
   */
  openEditModal(school: School): void {
    if (DEBUG) console.log('✏️ [SchoolsPage][openEditModal] Colegio:', school);

    this.modalMode = 'edit';
    this.selectedSchool = school;
    this.schoolForm.enable();

    this.schoolForm.patchValue({
      name:      school.name,
      commune:   school.commune || '',
      region:    school.region  || '',
      is_active: school.is_active
    });

    this.openModal();
  }

  /**
   * Abre el modal en modo visualización con campos deshabilitados.
   * @param {School} school Colegio a visualizar.
   */
  openViewModal(school: School): void {
    if (DEBUG) console.log('👁️ [SchoolsPage][openViewModal] Colegio:', school);

    this.modalMode = 'view';
    this.selectedSchool = school;

    this.schoolForm.patchValue({
      name:      school.name,
      commune:   school.commune || '',
      region:    school.region  || '',
      is_active: school.is_active
    });

    this.schoolForm.disable();
    this.openModal();
  }

  /**
   * Instancia y muestra el modal Bootstrap.
   */
  private openModal(): void {
    const modalEl = document.getElementById('schoolModal');
    if (!modalEl) {
      console.warn('⚠️ [SchoolsPage][openModal] No se encontró #schoolModal');
      return;
    }
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }

  /**
   * Cierra el modal y resetea el estado.
   */
  closeSchoolModal(): void {
    if (DEBUG) console.log('🪟 [SchoolsPage][closeSchoolModal] Cerrando modal...');

    const modalEl = document.getElementById('schoolModal');
    if (!modalEl) return;

    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    this.schoolForm.enable();
    this.selectedSchool = null;
    this.modalMode = 'create';
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  /**
   * Despacha el submit según el modo activo (create / edit).
   * @returns {Promise<void>}
   */
  async onSubmitSchool(): Promise<void> {
    if (DEBUG) console.log('🚀 [SchoolsPage][onSubmitSchool] Modo:', this.modalMode);

    if (this.schoolForm.invalid) {
      this.schoolForm.markAllAsTouched();
      this.toastService.show('Completa los campos obligatorios ⚠️', 'warning');
      return;
    }

    if (this.modalMode === 'create') { await this.onSubmitCreate(); return; }
    if (this.modalMode === 'edit')   { await this.onSubmitUpdate(); return; }
  }

  /**
   * Crea un nuevo colegio en Supabase.
   * @returns {Promise<void>}
   */
  async onSubmitCreate(): Promise<void> {
    if (DEBUG) console.log('🆕 [SchoolsPage][onSubmitCreate] Creando colegio...');

    this.saving.set(true);

    try {
      const raw = this.schoolForm.getRawValue();
      const payload: SchoolFormPayload = {
        name:      raw.name.trim(),
        commune:   raw.commune?.trim() || null,
        region:    raw.region?.trim()  || null,
        is_active: !!raw.is_active
      };

      if (DEBUG) console.log('📦 [SchoolsPage][onSubmitCreate] Payload:', payload);

      await this.schoolsService.createSchool(payload);

      this.toastService.show('Colegio creado correctamente 🏫', 'success');
      this.closeSchoolModal();
      await this.loadSchools();

    } catch (error) {
      console.error('🔴 [SchoolsPage][onSubmitCreate] Error:', error);
      this.toastService.show('Error al crear el colegio ❌', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Actualiza un colegio existente en Supabase.
   * @returns {Promise<void>}
   */
  async onSubmitUpdate(): Promise<void> {
    if (DEBUG) console.log('✏️ [SchoolsPage][onSubmitUpdate] Actualizando colegio...');

    if (!this.selectedSchool?.id) {
      this.toastService.show('No se encontró el colegio seleccionado ⚠️', 'warning');
      return;
    }

    this.saving.set(true);

    try {
      const raw = this.schoolForm.getRawValue();
      const payload: SchoolFormPayload = {
        name:      raw.name.trim(),
        commune:   raw.commune?.trim() || null,
        region:    raw.region?.trim()  || null,
        is_active: !!raw.is_active
      };

      if (DEBUG) console.log('📦 [SchoolsPage][onSubmitUpdate] Payload:', payload);

      await this.schoolsService.updateSchool(this.selectedSchool.id, payload);

      this.toastService.show('Colegio actualizado correctamente ✏️', 'success');
      this.closeSchoolModal();
      await this.loadSchools();

    } catch (error) {
      console.error('🔴 [SchoolsPage][onSubmitUpdate] Error:', error);
      this.toastService.show('Error al actualizar el colegio ❌', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  // ─── Toggle estado ────────────────────────────────────────────────────────────

  /**
   * Cambia el estado activo/inactivo del colegio con confirmación previa.
   * @param {School} school Colegio a actualizar.
   * @returns {Promise<void>}
   */
  async toggleStatus(school: School): Promise<void> {
    if (DEBUG) console.log('🔄 [SchoolsPage][toggleStatus] Colegio:', school.name);

    if (school.is_active) {
      const confirmed = window.confirm(`¿Seguro que deseas inactivar "${school.name}"?`);
      if (!confirmed) return;
    }

    this.updatingStatus.set(true);

    try {
      await this.schoolsService.toggleSchoolStatus(school.id, !school.is_active);

      this.toastService.show(
        school.is_active ? 'Colegio inactivado ⛔' : 'Colegio activado ✅',
        'success'
      );

      await this.loadSchools();

    } catch (error) {
      console.error('🔴 [SchoolsPage][toggleStatus] Error:', error);
      this.toastService.show('Error al cambiar estado ❌', 'error');
    } finally {
      this.updatingStatus.set(false);
    }
  }
}