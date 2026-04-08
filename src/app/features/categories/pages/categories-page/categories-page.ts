import { Component, OnInit, inject, signal, ElementRef, ViewChild, computed  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder,FormGroup,ReactiveFormsModule,Validators } from '@angular/forms';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../models/category.interface';
import { AuthService } from '../../../../auth/services/auth.service';


declare var bootstrap: any;
const DEBUG = true;

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss'
})
export class CategoriesPage implements OnInit {

	@ViewChild('categoryModal') categoryModalRef!: ElementRef;


  private readonly categoriesService = inject(CategoriesService);
	private readonly authService = inject(AuthService);
	private readonly fb = inject(FormBuilder);

  // ─── Estado general ───────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
	readonly saving = signal(false);
  errorMessage     = '';
  mode: 'create' | 'edit' | 'view' = 'create';
  selectedCategory: Category | null = null;

	/**
   * Computed que retorna el school_id del curso del usuario contextual.
   * Null si es admin o no tiene curso asignado.
   */
  readonly contextSchoolId = computed(() =>
    this.courseProfile()?.courses?.school_id ?? null
  );

	/**
   * Computed que retorna el nombre del colegio del usuario contextual.
   */
  readonly contextSchoolName = computed(() =>
    this.courseProfile()?.courses?.schools?.name ?? null
  );

	 // ─── Datos ────────────────────────────────────────────────────────────────────
  /** Lista completa desde Supabase — no se modifica al filtrar */
  private allCategories: Category[] = [];

	// ─── Formulario ──────────────────────────────────────────────────────────────
  categoryForm!: FormGroup;

	// ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm: string    = '';
  selectedType: string  = '';
  selectedStatus: string = '';

	// ─── Paginación frontend ──────────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number    = 5;
  readonly pageSizeOptions: number[] = [5, 10, 25];

	// ─── Rol y contexto ──────────────────────────────────────────────────────────
  readonly isAdmin      = computed(() => this.authService.isAdmin());
  readonly courseProfile = computed(() => this.authService.courseProfile());

	 // ─── Autocomplete ─────────────────────────────────────────────────────────────
  readonly suggestions = [
    'Cuota mensual', 'Cuota extraordinaria', 'Rifa', 'Bingo',
    'Paseo', 'Materiales', 'Acto escolar', 'Premiación',
    'Compras varias', 'Gastos administrativos'
  ];
  filteredSuggestions: string[] = [];
  showSuggestions = false;
 
	// después de selectedCategory
	categoryToToggle: Category | null = null;
	toggleModalInstance: any = null;

	deleteModalInstance: any = null;
	categoryToDelete: Category | null = null;

	// ─── Reactive Form ────────────────────────────────────────────────────────────────────
/* 	readonly categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['expense', [Validators.required]],
    is_active: [true]
  }); */
 

  

	// ─── Modal / Formulario ───────────────────────────────────────────────────────
  private categoryModalInstance: any = null;

	//selectedCategory: Category | null = null;
	//mode: 'create' | 'edit' | 'view' = 'create';

 
// ─── Autocomplete Sugerencias de nombres de categorías / Formulario ───────────────────────────────────────────────────────
  /* readonly incomeSuggestions: string[] = [
    'Cuota mensual',
    'Cuota extraordinaria',
    'Rifa',
    'Bingo',
    'Venta de completos',
    'Donación',
    'Aporte apoderados',
    'Actividad benéfica'
  ];

  readonly expenseSuggestions: string[] = [
    'Materiales',
    'Decoración',
    'Transporte',
    'Colación',
    'Premio',
    'Impresión',
    'Regalo profesor',
    'Insumos evento'
  ]; */

  //showSuggestions = false;

 
	// ─── Lifecycle ────────────────────────────────────────────────────────────────
	constructor() {
    if (DEBUG) console.log('🏷️ [CategoriesPage] Init');
  }	
   
	/**
   * Inicializa el componente cargando categorías según el rol del usuario.
   * Admin → todas las categorías globales.
   * Usuario contextual → categorías globales + las de su colegio.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('[CategoriesPage][ngOnInit] Iniciando...');
    this.initForm();
    await this.loadCategories();
  }

	/**
   * Inicializa el formulario reactivo de categoría.
   */
  private initForm(): void {
    if (DEBUG) console.log('[CategoriesPage][initForm] Inicializando formulario...');
    this.categoryForm = this.fb.group({
      name:      ['', [Validators.required]],
      type:      ['income', [Validators.required]],
      is_active: [true],
    });
  }

	/**
   * Carga categorías desde Supabase según el rol del usuario.
   * Admin → getCategories() (todas).
   * Contextual → getCategoriesBySchool(schoolId).
   */
  async loadCategories(): Promise<void> {
    if (DEBUG) console.log('[CategoriesPage][loadCategories] Cargando...');
    this.loading.set(true);
    this.errorMessage = '';

    try {
      const schoolId = this.contextSchoolId();

      if (!this.isAdmin() && schoolId) {
        if (DEBUG) console.log('[CategoriesPage][loadCategories] Modo contextual → schoolId:', schoolId);
        this.allCategories = await this.categoriesService.getCategoriesBySchool(schoolId);
      } else {
        if (DEBUG) console.log('[CategoriesPage][loadCategories] Modo admin → todas');
        this.allCategories = await this.categoriesService.getCategories();
      }

      if (DEBUG) console.log('[CategoriesPage][loadCategories] Total:', this.allCategories.length);
    } catch (error) {
      console.error('[CategoriesPage][loadCategories] Error:', error);
      this.errorMessage = 'No fue posible cargar las categorías.';
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Filtros y paginación ────────────────────────────────────────────────────

	/**
   * Lista filtrada según búsqueda, tipo y estado activos.
   * Se recalcula cada vez que cambia algún filtro.
   * @returns {Category[]}
   */
  get filteredCategories(): Category[] {
    return this.allCategories.filter(c => {
      const matchSearch = !this.searchTerm ||
        c.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchType   = !this.selectedType   || c.type === this.selectedType;
      const matchStatus = !this.selectedStatus || String(c.is_active) === this.selectedStatus;
      return matchSearch && matchType && matchStatus;
    });
  }
   
	
	/* get filteredCategories(): Category[] {
    let result = this.allCategories;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(category =>
        category.name.toLowerCase().includes(term)
      );
    }

    if (this.selectedType) {
      result = result.filter(category => category.type === this.selectedType);
    }

    if (this.selectedStatus !== '') {
      const isActive = this.selectedStatus === 'true';
      result = result.filter(category => category.is_active === isActive);
    }

    return result;
  } */

  /**
   * Total de categorías después de aplicar filtros.
   * @returns {number}
   */
  get totalFiltered(): number { return this.filteredCategories.length; }

  /**
   * Total de páginas según registros filtrados y pageSize.
   * @returns {number}
   */
  get totalPages(): number    { return Math.ceil(this.totalFiltered / this.pageSize); }

	/**
   * Array de números de página para renderizar la paginación.
   * @returns {number[]}
   */
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  /**
   * Índice del primer registro en la página actual.
   * @returns {number}
   */
  get fromRecord(): number    { return this.totalFiltered === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }

  /**
   * Índice del último registro en la página actual.
   * @returns {number}
   */
  get toRecord(): number { return Math.min(this.currentPage * this.pageSize, this.totalFiltered); }

  /**
   * Categorías de la página actual después de filtrar y paginar.
   * @returns {Category[]}
   */
  get pagedCategories(): Category[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  /**
   * Retorna true si hay algún filtro activo.
   * @returns {boolean}
   */
  get hasActiveFilters(): boolean {
    return !!this.searchTerm || !!this.selectedType || !!this.selectedStatus;
  }

	 // ─── Handlers de filtros ──────────────────────────────────────────────────────

	// ─── Paginación ───────────────────────────────────────────────────────────────
  /**
   * Maneja el input de búsqueda. Resetea a página 1 al buscar.
   */ 
  onSearchInput(): void {
    if (DEBUG) console.log('🔍 [CategoriesPage][onSearchInput] searchTerm:', this.searchTerm);
    this.currentPage = 1;
  }

	 /**
   * Maneja el cambio del filtro de tipo. Resetea a página 1.
   */
  onTypeFilterChange(): void {
    if (DEBUG) console.log('🔖 [CategoriesPage][onTypeFilterChange] tipo:', this.selectedType);
    this.currentPage = 1;
  }

	 /**
   * Maneja el cambio del filtro de estado. Resetea a página 1.
   */
  onStatusFilterChange(): void {
    if (DEBUG) console.log('🔘 [CategoriesPage][onStatusFilterChange] estado:', this.selectedStatus);
    this.currentPage = 1;
  }  

  /**
   * Maneja el cambio del selector de registros por página. Resetea a página 1.
   */
  onPageSizeChange(): void {
    if (DEBUG) console.log('📏 [CategoriesPage][onPageSizeChange] pageSize:', this.pageSize);
    this.currentPage = 1;
  }

	/**
   * Navega a una página específica si está dentro del rango válido.
   * @param {number} page Número de página destino.
   */
  goToPage(page: number): void {
    if (DEBUG) console.log('📄 [CategoriesPage][goToPage] página:', page);
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

	 /**
   * Limpia todos los filtros activos y vuelve a la página 1.
   */
   clearFilters(): void {
    if (DEBUG) console.log('🧹 [CategoriesPage][clearFilters] Limpiando filtros...');
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.currentPage = 1;
  }

	// ─── Modal ───────────────────────────────────────────────────────────────────

	/**
   * Abre el modal de creación de categoría y reinicia el formulario.
   */
  openCreateModal(): void {
    this.mode = 'create';
		this.selectedCategory = null;

		this.resetForm();
		this.categoryForm.enable();

		this.categoryModalInstance = new bootstrap.Modal(this.categoryModalRef.nativeElement);
		this.categoryModalInstance.show();
  }

	/**
   * Abre el modal en modo editar con los datos de la categoría.
   * @param {Category} category Categoría a editar.
   */
  openEditModal(category: Category): void {
    if (DEBUG) console.log('[CategoriesPage][openEditModal]', category);
    this.mode = 'edit';
    this.selectedCategory = category;
    this.errorMessage = '';
    this.categoryForm.reset({
      name:      category.name,
      type:      category.type,
      is_active: category.is_active,
    });
    this.categoryForm.enable();
    this._openModal();
  }

	/**
   * Abre el modal en modo vista con los datos de la categoría.
   * @param {Category} category Categoría a visualizar.
   */
  openViewModal(category: Category): void {
    if (DEBUG) console.log('[CategoriesPage][openViewModal]', category);
    this.mode = 'view';
    this.selectedCategory = category;
    this.errorMessage = '';
    this.categoryForm.reset({
      name:      category.name,
      type:      category.type,
      is_active: category.is_active,
    });
    this.categoryForm.disable();
    this._openModal();
  }

	/**
   * Cierra el modal actual.
   */
  closeModal(): void {
		if (DEBUG) console.log('[CategoriesPage][closeModal]');
		if (this.categoryModalInstance) {
			this.categoryModalInstance.hide();
		}
		this.selectedCategory = null;
		this.errorMessage = '';
	}

	private _openModal(): void {
		this.categoryModalInstance = bootstrap.Modal.getInstance(
			this.categoryModalRef.nativeElement
		) || new bootstrap.Modal(this.categoryModalRef.nativeElement);
		this.categoryModalInstance.show();
	}


// ─── CRUD ────────────────────────────────────────────────────────────────────
	/**
   * Guarda una nueva categoría en Supabase.
   * @returns {Promise<void>}
   */
	async saveCategory(): Promise<void> {
    if (DEBUG) console.log('[CategoriesPage][saveCategory] Modo:', this.mode);

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage = '';

    try {
      const formValue = this.categoryForm.getRawValue();

      if (this.mode === 'create') {
        const payload: any = {
          name:      formValue.name.trim(),
          type:      formValue.type,
          is_active: formValue.is_active,
        };

        // Si es usuario contextual, asigna school_id automáticamente
        const schoolId = this.contextSchoolId();
        if (!this.isAdmin() && schoolId) {
          payload.school_id = schoolId;
          if (DEBUG) console.log('[CategoriesPage][saveCategory] Asignando school_id:', schoolId);
        }

        await this.categoriesService.createCategory(payload);
        if (DEBUG) console.log('[CategoriesPage][saveCategory] Categoría creada');

      } else if (this.mode === 'edit' && this.selectedCategory) {
        await this.categoriesService.updateCategory(this.selectedCategory.id, {
          name:      formValue.name.trim(),
          type:      formValue.type,
          is_active: formValue.is_active,
        });
        if (DEBUG) console.log('[CategoriesPage][saveCategory] Categoría actualizada');
      }

      this.closeModal();
      await this.loadCategories();

    } catch (error) {
      console.error('[CategoriesPage][saveCategory] Error:', error);
      this.errorMessage = 'No fue posible guardar la categoría.';
    } finally {
      this.saving.set(false);
    }
  }

	/**
   * Activa o desactiva una categoría.
   * @param {Category} category Categoría a modificar.
   */
  async toggleCategoryStatus(category: Category): Promise<void> {
    if (DEBUG) console.log('[CategoriesPage][toggleCategoryStatus]', category.id, '→', !category.is_active);
    try {
      await this.categoriesService.updateCategory(category.id, {
        is_active: !category.is_active
      });
      await this.loadCategories();
    } catch (error) {
      console.error('[CategoriesPage][toggleCategoryStatus] Error:', error);
    }
  }

	// ─── Autocomplete ─────────────────────────────────────────────────────────────

  /** @param event Input del nombre de categoría */
  onCategoryNameInput(): void {
		if (DEBUG) {
      console.log('✍️ [CategoriesPage][onCategoryNameInput] Valor:', this.categoryNameValue);
    }
    const val = this.categoryForm.get('name')?.value || '';
    this.filteredSuggestions = this.suggestions.filter(s =>
      s.toLowerCase().includes(val.toLowerCase()) && val.length > 0
    );
    this.showSuggestions = this.filteredSuggestions.length > 0;
  }

  onCategoryNameFocus(): void { 
		 if (DEBUG) console.log('🎯 [CategoriesPage][onCategoryNameFocus] Mostrando sugerencias...');
		 this.onCategoryNameInput(); 
	}

  onCategoryNameBlur():  void { 
		if (DEBUG) console.log('🫥 [CategoriesPage][onCategoryNameBlur] Ocultando sugerencias...');
		setTimeout(() => this.showSuggestions = false, 150);
	}

  /** @param suggestion Sugerencia seleccionada */
  selectSuggestion(suggestion: string): void {
		if (DEBUG) {
      console.log('✅ [CategoriesPage][selectSuggestion] Sugerencia seleccionada:', suggestion);
    }
    this.categoryForm.get('name')?.setValue(suggestion);
    this.showSuggestions = false;
  }

// ─── Helpers ─────────────────────────────────────────────────────────────────
	/**
   * Retorna true si un campo del formulario es inválido y ya fue tocado
   * o si el formulario fue enviado.
   * @param {string} fieldName Nombre del control.
   * @returns {boolean}
   */
  isFieldInvalid(field: string): boolean {
    const control = this.categoryForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

	  /**
   * Retorna el label legible del tipo de categoría.
   * @param {string} type Tipo de categoría ('income' | 'expense').
   * @returns {string}
   */
  getTypeLabel(type: string): string {
    return type === 'income' ? 'Ingreso' : 'Egreso';
  }

	/**
	 * Retorna el icono según el tipo.
	 * @param type Tipo de categoría 
	 */
	getTypeIcon(type: string): string {
		return type === 'income' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle';
	}

	/**
   * Retorna la clase CSS del badge según el tipo de categoría.
   * @param {string} type Tipo de categoría.
   * @returns {string}
   */
  getTypeBadgeClass(type: string): string {
     return type === 'income' ? 'transaction-type-badge--income' : 'transaction-type-badge--expense';
		 //return type==='income'? 'Ingreso': 'Egreso';
  }


   

  // ─── Carga de datos ───────────────────────────────────────────────────────────

  /**
   * Obtiene todas las categorías desde el servicio.
   * Los filtros y paginación se aplican en frontend sobre esta lista.
   *
   * @returns {Promise<void>}
   */
  /* async loadCategories(): Promise<void> {
    if (DEBUG) console.log('🔄 [CategoriesPage][loadCategories] Cargando categorías...');

    this.loading.set(true);
    this.errorMessage = '';

    try {
      this.allCategories = await this.categoriesService.getCategories();
      if (DEBUG) {
        console.log('✅ [CategoriesPage][loadCategories] Categorías obtenidas:', this.allCategories);
      }
    } catch (error) {
      console.error('🔴 [CategoriesPage][loadCategories] Error:', error);
      this.errorMessage = 'No fue posible cargar las categorías.';
    } finally {
      this.loading.set(false);
    }
  } */

	

	

	

	 
	 

 
	/**
 * Reinicia el formulario a sus valores por defecto.
 */
resetForm(): void {
  if (DEBUG) console.log('[CategoriesPage][resetForm] Reseteando formulario...');
  this.categoryForm.reset({
    name:      '',
    type:      'income',
    is_active: true,
  });
  this.errorMessage = '';
  this.filteredSuggestions = [];
  this.showSuggestions = false;
}
  /* resetForm(): void {
    if (DEBUG) console.log('🧹 [CategoriesPage][resetForm] Reiniciando formulario...');

    this.errorMessage = '';
    this.successMessage = '';
		this.showSuggestions = false;
    this.categoryForm.reset({
      name: '',
      type: 'expense',
      is_active: true
    });
		
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
  } */

 

 

 

 

 

  // ─── Helpers ──────────────────────────────────────────────────────────────────



  
	

	  /**
   * Retorna el valor actual del campo nombre del formulario.
   * @returns {string}
   */
  get categoryNameValue(): string {
    return this.categoryForm.get('name')?.value ?? '';
  }

  /**
   * Retorna el tipo actual seleccionado en el formulario.
   * @returns {string}
   */
  get categoryTypeValue(): string {
    return this.categoryForm.get('type')?.value ?? 'expense';
  }

	/**
 * Abre el modal de confirmación para activar/desactivar una categoría.
 * @param {Category} category Categoría a modificar.
 */
openToggleConfirmModal(category: Category): void {
  if (DEBUG) console.log('[CategoriesPage][openToggleConfirmModal]', category);
  this.categoryToToggle = category;
  const modalEl = document.getElementById('toggleCategoryModal');
  this.toggleModalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  this.toggleModalInstance.show();
}

/**
 * Cierra el modal de confirmación de activar/desactivar.
 */
closeToggleConfirmModal(): void {
  if (DEBUG) console.log('[CategoriesPage][closeToggleConfirmModal]');
  if (this.toggleModalInstance) this.toggleModalInstance.hide();
  this.categoryToToggle = null;
}

/**
 * Confirma el cambio de estado de la categoría seleccionada.
 */
async confirmToggleCategory(): Promise<void> {
  if (!this.categoryToToggle) return;
  if (DEBUG) console.log('[CategoriesPage][confirmToggleCategory]', this.categoryToToggle.id);

  this.saving.set(true);
  try {
    await this.categoriesService.updateCategory(this.categoryToToggle.id, {
      is_active: !this.categoryToToggle.is_active
    });
    this.closeToggleConfirmModal();
    await this.loadCategories();
    if (DEBUG) console.log('[CategoriesPage][confirmToggleCategory] Estado cambiado correctamente');
  } catch (error) {
    console.error('[CategoriesPage][confirmToggleCategory] Error:', error);
    this.errorMessage = 'No fue posible cambiar el estado de la categoría.';
  } finally {
    this.saving.set(false);
  }
}

  /**
   * Retorna las sugerencias base según el tipo seleccionado.
   * @returns {string[]}
   */
  /* get currentSuggestions(): string[] {
    return this.categoryTypeValue === 'income'
      ? this.incomeSuggestions
      : this.expenseSuggestions;
  }
 */
  /**
   * Retorna las sugerencias filtradas según el texto escrito por el usuario.
   * @returns {string[]}
   */
/*   get filteredSuggestions(): string[] {
    const term = this.categoryNameValue.trim().toLowerCase();

    if (!term) {
      return this.currentSuggestions.slice(0, 5);
    }

    return this.currentSuggestions
      .filter(item => item.toLowerCase().includes(term))
      .slice(0, 5);
  } */

   /**
	 * Abre el modal de confirmación para eliminar una categoría.
	 * @param {Category} category Categoría a eliminar.
	 */
	openDeleteModal(category: Category): void {
		if (DEBUG) console.log('[CategoriesPage][openDeleteModal]', category);
		this.categoryToDelete = category;
		const modalEl = document.getElementById('deleteCategoryModal');
		this.deleteModalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
		this.deleteModalInstance.show();
	}

	/**
	 * Cierra el modal de confirmación de eliminación.
	 */
	closeDeleteModal(): void {
		if (DEBUG) console.log('[CategoriesPage][closeDeleteModal]');
		if (this.deleteModalInstance) this.deleteModalInstance.hide();
		this.categoryToDelete = null;
	}

	/**
	 * Confirma y ejecuta la eliminación de la categoría seleccionada.
	 */
	async confirmDeleteCategory(): Promise<void> {
		if (!this.categoryToDelete) return;
		if (DEBUG) console.log('[CategoriesPage][confirmDeleteCategory]', this.categoryToDelete.id);

		this.saving.set(true);
		try {
			await this.categoriesService.deleteCategory(this.categoryToDelete.id);
			this.closeDeleteModal();
			await this.loadCategories();
			if (DEBUG) console.log('[CategoriesPage][confirmDeleteCategory] Eliminada correctamente');
		} catch (error) {
			console.error('[CategoriesPage][confirmDeleteCategory] Error:', error);
			this.errorMessage = 'No fue posible eliminar la categoría.';
		} finally {
			this.saving.set(false);
		}
	}
 

	 

	 

	 

	 
}