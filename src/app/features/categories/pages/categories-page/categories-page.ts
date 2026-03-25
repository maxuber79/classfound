import { Component, OnInit, inject, signal, ElementRef, ViewChild  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder,FormGroup,ReactiveFormsModule,Validators } from '@angular/forms';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../models/category.interface';

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

  private readonly categoriesService = inject(CategoriesService);
	private readonly fb = inject(FormBuilder);

	@ViewChild('categoryModal') categoryModalRef!: ElementRef;


  // ─── Estado general ───────────────────────────────────────────────────────────────────
  readonly loading = signal(false);
	readonly saving = signal(false);
  errorMessage: string = '';
	successMessage: string = '';

  // ─── Datos ────────────────────────────────────────────────────────────────────
  /** Lista completa desde Supabase — no se modifica al filtrar */
  private allCategories: Category[] = [];

	// ─── Reactive Form ────────────────────────────────────────────────────────────────────
	readonly categoryForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['expense', [Validators.required]],
    is_active: [true]
  });
  // ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm: string    = '';
  selectedType: string  = '';
  selectedStatus: string = '';

  // ─── Paginación frontend ──────────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number    = 5;
  readonly pageSizeOptions: number[] = [5, 10, 25];

	// ─── Modal / Formulario ───────────────────────────────────────────────────────
  private categoryModalInstance: any = null;

	selectedCategory: Category | null = null;
	mode: 'create' | 'edit' | 'view' = 'create';

 
// ─── Sugerencias de nombres de categorías / Formulario ───────────────────────────────────────────────────────
  readonly incomeSuggestions: string[] = [
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
  ];

  showSuggestions = false;

 
	// ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización. Carga las categorías al iniciar la vista.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [CategoriesPage][ngOnInit] Inicializando...');
    await this.loadCategories();
  }

  // ─── Computed ─────────────────────────────────────────────────────────────────

  /**
   * Lista filtrada según búsqueda, tipo y estado activos.
   * Se recalcula cada vez que cambia algún filtro.
   * @returns {Category[]}
   */
  /**
   * Lista filtrada según búsqueda, tipo y estado.
   * @returns {Category[]}
   */
  get filteredCategories(): Category[] {
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
  }

  /**
   * Total de categorías después de aplicar filtros.
   * @returns {number}
   */
  get totalFiltered(): number {
    return this.filteredCategories.length;
  }

  /**
   * Total de páginas según registros filtrados y pageSize.
   * @returns {number}
   */
  get totalPages(): number {
    return Math.ceil(this.totalFiltered / this.pageSize);
  }

  /**
   * Índice del primer registro en la página actual.
   * @returns {number}
   */
  get fromRecord(): number {
    if (this.totalFiltered === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /**
   * Índice del último registro en la página actual.
   * @returns {number}
   */
  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalFiltered);
  }

  /**
   * Array de números de página para renderizar la paginación.
   * @returns {number[]}
   */
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  /**
   * Categorías de la página actual después de filtrar y paginar.
   * @returns {Category[]}
   */
  get pagedCategories(): Category[] {
    const from = (this.currentPage - 1) * this.pageSize;
    const to = from + this.pageSize;
    return this.filteredCategories.slice(from, to);
  }

  /**
   * Retorna true si hay algún filtro activo.
   * @returns {boolean}
   */
  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedType || this.selectedStatus);
  }

   

  // ─── Carga de datos ───────────────────────────────────────────────────────────

  /**
   * Obtiene todas las categorías desde el servicio.
   * Los filtros y paginación se aplican en frontend sobre esta lista.
   *
   * @returns {Promise<void>}
   */
  async loadCategories(): Promise<void> {
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
  }

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
   * Cierra el modal actual.
   */
  closeModal(): void {
    if (DEBUG) console.log('❎ [CategoriesPage][closeModal] Cerrando modal...');
    if (this.categoryModalInstance) {
      this.categoryModalInstance.hide();
    }
  }

	/**
   * Retorna true si un campo del formulario es inválido y ya fue tocado
   * o si el formulario fue enviado.
   * @param {string} fieldName Nombre del control.
   * @returns {boolean}
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.categoryForm.get(fieldName);
    return !!field && field.invalid && (field.touched || field.dirty);
  }

	/**
   * Guarda una nueva categoría en Supabase.
   * @returns {Promise<void>}
   */
  async saveCategory(): Promise<void> {
			if (this.categoryForm.invalid) {
			this.categoryForm.markAllAsTouched();
			return;
		}

		this.saving.set(true);

		try {
			const payload = {
				name: this.categoryForm.value.name?.trim(),
				type: this.categoryForm.value.type,
				is_active: this.categoryForm.value.is_active
			};

			if (this.mode === 'create') {
				if (DEBUG) console.log('🆕 Creando categoría:', payload);
				await this.categoriesService.createCategory(payload);
			}

			if (this.mode === 'edit' && this.selectedCategory) {
				if (DEBUG) console.log('✏️ Actualizando categoría:', payload);

				await this.categoriesService.updateCategory(
					this.selectedCategory.id,
					payload
				);
			}

			await this.loadCategories();
			this.closeModal();

		} catch (error) {
			console.error('🔴 Error guardando:', error);
		} finally {
			this.saving.set(false);
		}
  }

	 

	/**
   * Reinicia el formulario reactivo y limpia mensajes del modal.
   */
  resetForm(): void {
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
  }

  // ─── Handlers de filtros ──────────────────────────────────────────────────────

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
   * Limpia todos los filtros activos y vuelve a la página 1.
   */
   clearFilters(): void {
    if (DEBUG) console.log('🧹 [CategoriesPage][clearFilters] Limpiando filtros...');
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedStatus = '';
    this.currentPage = 1;
  }

  // ─── Paginación ───────────────────────────────────────────────────────────────

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
   * Maneja el cambio del selector de registros por página. Resetea a página 1.
   */
  onPageSizeChange(): void {
    if (DEBUG) console.log('📏 [CategoriesPage][onPageSizeChange] pageSize:', this.pageSize);
    this.currentPage = 1;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Retorna el label legible del tipo de categoría.
   * @param {string} type Tipo de categoría ('income' | 'expense').
   * @returns {string}
   */
  getTypeLabel(type: string): string {
    return type === 'income' ? 'Ingreso' : 'Egreso';
  }

  /**
   * Retorna la clase CSS del badge según el tipo de categoría.
   * @param {string} type Tipo de categoría.
   * @returns {string}
   */
  getTypeBadgeClass(type: string): string {
    return type === 'income' ? 'bg-success' : 'bg-warning text-dark';
  }
	/**
	 * Retorna el icono según el tipo.
	 */
	getTypeIcon(type: string): string {
		return type === 'income' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle';
	}

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
   * Retorna las sugerencias base según el tipo seleccionado.
   * @returns {string[]}
   */
  get currentSuggestions(): string[] {
    return this.categoryTypeValue === 'income'
      ? this.incomeSuggestions
      : this.expenseSuggestions;
  }

  /**
   * Retorna las sugerencias filtradas según el texto escrito por el usuario.
   * @returns {string[]}
   */
  get filteredSuggestions(): string[] {
    const term = this.categoryNameValue.trim().toLowerCase();

    if (!term) {
      return this.currentSuggestions.slice(0, 5);
    }

    return this.currentSuggestions
      .filter(item => item.toLowerCase().includes(term))
      .slice(0, 5);
  }

  /**
   * Maneja la escritura en el campo nombre para mostrar sugerencias.
   */
  onCategoryNameInput(): void {
    if (DEBUG) {
      console.log('✍️ [CategoriesPage][onCategoryNameInput] Valor:', this.categoryNameValue);
    }

    this.showSuggestions = true;
  }

  /**
   * Maneja el foco del input nombre.
   */
  onCategoryNameFocus(): void {
    if (DEBUG) console.log('🎯 [CategoriesPage][onCategoryNameFocus] Mostrando sugerencias...');
    this.showSuggestions = true;
  }

  /**
   * Oculta la lista de sugerencias con un pequeño delay
   * para permitir el click sobre una opción.
   */
  onCategoryNameBlur(): void {
    if (DEBUG) console.log('🫥 [CategoriesPage][onCategoryNameBlur] Ocultando sugerencias...');
    setTimeout(() => {
      this.showSuggestions = false;
    }, 150);
  }

  /**
   * Selecciona una sugerencia y la aplica al formulario.
   * @param {string} suggestion Nombre sugerido.
   */
  selectSuggestion(suggestion: string): void {
    if (DEBUG) {
      console.log('✅ [CategoriesPage][selectSuggestion] Sugerencia seleccionada:', suggestion);
    }

    this.categoryForm.patchValue({
      name: suggestion
    });

    this.showSuggestions = false;
  }

	openViewModal(category: Category): void {
		if (DEBUG) console.log('👁️ Ver categoría:', category);

		this.mode = 'view';
		this.selectedCategory = category;

		this.categoryForm.patchValue({
			name: category.name,
			type: category.type,
			is_active: category.is_active
		});

		this.categoryForm.disable();

		this.categoryModalInstance = new bootstrap.Modal(this.categoryModalRef.nativeElement);
		this.categoryModalInstance.show();
	}

	openEditModal(category: Category): void {
		if (DEBUG) console.log('✏️ Editar categoría:', category);

		this.mode = 'edit';
		this.selectedCategory = category;

		this.categoryForm.enable();

		this.categoryForm.patchValue({
			name: category.name,
			type: category.type,
			is_active: category.is_active
		});

		this.categoryModalInstance = new bootstrap.Modal(this.categoryModalRef.nativeElement);
		this.categoryModalInstance.show();
	}

	   /**
   * Activa o desactiva una categoría.
   * Si la categoría está activa, solicita confirmación antes de desactivarla.
   * Si está inactiva, la activa directamente.
   * @param {Category} category Categoría a actualizar.
   * @returns {Promise<void>}
   */
  async toggleCategoryStatus(category: Category): Promise<void> {
    const newStatus = !category.is_active;

    if (DEBUG) {
      console.log('🔄 [CategoriesPage][toggleCategoryStatus] Categoría:', category);
      console.log('🔄 [CategoriesPage][toggleCategoryStatus] Nuevo estado:', newStatus);
    }

    // Confirmar solo al desactivar
    if (category.is_active) {
      const confirmed = window.confirm(
        `¿Estás seguro que quieres desactivar la categoría "${category.name}"?`
      );

      if (!confirmed) {
        if (DEBUG) {
          console.log('⛔ [CategoriesPage][toggleCategoryStatus] Acción cancelada por el usuario');
        }
        return;
      }
    }

    try {
      await this.categoriesService.updateCategory(category.id, {
        is_active: newStatus
      });

      if (DEBUG) {
        console.log('✅ [CategoriesPage][toggleCategoryStatus] Estado actualizado correctamente');
      }

      await this.loadCategories();
    } catch (error) {
      console.error('🔴 [CategoriesPage][toggleCategoryStatus] Error al cambiar estado:', error);
      this.errorMessage = 'No fue posible actualizar el estado de la categoría.';
    }
  }

	 
}