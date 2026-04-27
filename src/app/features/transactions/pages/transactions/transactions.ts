import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TransactionsService } from '../../services/transactions.service';
import { CategoriesService } from '../../../categories/services/categories.service';
import { TransactionListItem } from '../../models/transaction.interface';
import { Category } from '../../../categories/models/category.interface';
import { AuthService } from '../../../../auth/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';


import { ReceiptsService } from '../../../receipts/services/receipts.service';
import { Receipt } from '../../../receipts/models/receipt.interface';


declare var bootstrap: any;
const DEBUG=true;

@Component( {
    selector: 'app-transactions-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './transactions.html',
    styleUrl: './transactions.scss'
  }

) export class TransactionsPage implements OnInit {

  private readonly transactionsService=inject(TransactionsService);
  private readonly categoriesService=inject(CategoriesService);
	private readonly authService=inject(AuthService);
  private readonly fb=inject(FormBuilder);
	private toastService = inject(ToastService);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly receiptsService = inject(ReceiptsService);

  // ─── Estado ───────────────────────────────────────────────────────────────────
  readonly loading=signal(false);
  readonly saving=signal(false);
  errorMessage: string='';


	// --- estado de edición --------------------------------------------------------
	selectedTransaction: TransactionListItem | null = null;
	modalMode: 'create' | 'edit' | 'view' = 'create';

	//isAdmin = true; // 👈 temporal para pruebas
	/**
	 * Signal derivada desde AuthService que indica si el usuario es admin.
	 * Reemplaza el flag temporal isAdmin = true.
	 */
	readonly isAdmin = this.authService.isAdmin;

	/**
	 * Contexto opcional de curso.
	 * Si tiene valor, la pantalla trabajará en modo contextual
	 * y cargará solo las transacciones de ese curso.
	 */
	ejId = {
		id0: null,
		id1: '9566f309-ed18-4def-87c5-fc1917ea7375',
		id2: '3424d9c6-9389-4b29-83b1-67b080adc375'
	};
	contextCourseId: string | null = null;//"9566f309-ed18-4def-87c5-fc1917ea7375" '3424d9c6-9389-4b29-83b1-67b080adc375'	
	/**
	 * Información del curso contextual actual.
	 * Se utiliza para mostrar el curso en el modal cuando la pantalla
	 * trabaja en modo contextual, incluso si aún no existen transacciones.
	 */
	contextCourseInfo: {
		id: string;
		name: string;
		school_name: string;
		school_year: number | null;
		school_id: string | null;
	} | null = null;
	/** Estado de eliminación en curso. */
	readonly deleting = signal(false);

  // ─── Datos ─────────────────────────────					───────────────────────────────────────
  /** Lista completa — base para filtros y métricas */
  protected allTransactions: TransactionListItem[]=[];
	activeCourses: any[] = [];
  /** Categorías activas para el select del formulario */
  activeCategories: Category[]=[];

  // ─── Formulario nueva transacción ─────────────────────────────────────────────
  transactionForm !: FormGroup;
  isCreating: boolean=false;

  // ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm: string='';
  selectedType: string='';
  dateFrom: string='';
  dateTo: string='';

  // ─── Paginación frontend ──────────────────────────────────────────────────────
  currentPage: number=1;
  pageSize: number=10;
  readonly pageSizeOptions: number[]=[5, 10, 25, 50];

// ─── Estado comprobantes ──────────────────────────────────────────────────────
/** Comprobante de la transacción seleccionada. null = sin comprobante. */
readonly loadingReceipt = signal(false);
readonly uploadingReceipt = signal(false);
readonly deletingReceipt = signal(false);
readonly currentReceipt = signal<Receipt | null>(null);
readonly selectedFile = signal<File | null>(null);
readonly receiptSignedUrl = signal<string | null>(null);

/** true si el comprobante actual es una imagen (no PDF). */
readonly isImageReceipt = computed(() => {
    const receipt = this.currentReceipt();
    if (!receipt) return false;
    return receipt.mime_type.startsWith('image/');
});


  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización. Carga transacciones y categorías activas en paralelo.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [TransactionsPage][ngOnInit] Inicializando...');
    
		//this.toastService.show('Toast success de prueba', 'success');
		//this.toastService.show('Toast error de prueba', 'error');
		//this.toastService.show('Toast warning de prueba', 'warning');
		//this.toastService.show('Toast info de prueba', 'info');
		const courseIdFromRoute = this.route.snapshot.paramMap.get('courseId');
  	this.contextCourseId = courseIdFromRoute;

		if (DEBUG) {
    if (this.contextCourseId) {
      console.log('📍 [TransactionsPage][ngOnInit] courseId desde ruta:', this.contextCourseId);
    } else {
      console.log('🌐 [TransactionsPage][ngOnInit] Modo global');
    }
  }

		//Inicializar formulario reactivo
		// Inicializar formulario reactivo
		this.initForm();
		await this.loadTransactions();
		await this.loadActiveCourses();
		await this.loadActiveCategories(); // 👈 debe ir después de loadActiveCourses
  }

  // ─── Setup ────────────────────────────────────────────────────────────────────

  /**
   * Inicializa el formulario reactivo para crear una transacción.
   * Por defecto tipo 'income' y fecha de hoy.
   */
  private initForm(): void {
    if (DEBUG) console.log('🧩 [TransactionsPage][initForm] Inicializando formulario...');

    const today=new Date().toISOString().split('T')[0];

    this.transactionForm = this.fb.group({
			course_id: ['', [Validators.required]],
			type: ['income', [Validators.required]],
			category_id: ['', [Validators.required]],
			amount: [null, [Validators.required, Validators.min(1)]],
			transaction_date: [today, [Validators.required]],
			description: [''],
			notes: [''],
		}); 

    if (DEBUG) console.log('✅ [TransactionsPage][initForm] Formulario creado');
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────────

	/**
	 * Obtiene los cursos activos para poblar el select del formulario.
	 * @returns {Promise<void>}
	 */
	async loadActiveCourses(): Promise<void> {
		if (DEBUG) console.log('🏫 [TransactionsPage][loadActiveCourses] Cargando cursos activos...');

		try {
			this.activeCourses = await this.transactionsService.getActiveCourses();
			if (DEBUG) console.log('✅ [TransactionsPage][loadActiveCourses] Total:', this.activeCourses.length);
			this.resolveContextCourseInfo();
		} catch (error) {
			console.error('🔴 [TransactionsPage][loadActiveCourses] Error:', error);
		}
	}

  /**
   * Obtiene todas las transacciones desde Supabase.
   * Al recargar recalcula automáticamente métricas y tabla.
   * @returns {Promise<void>}
   */
  /* async loadTransactions(): Promise<void> {
    if (DEBUG) console.log('🔄 [TransactionsPage][loadTransactions] Cargando...');

    this.loading.set(true);
    this.errorMessage='';

    try {
      this.allTransactions=await this.transactionsService.getTransactions();
      if (DEBUG) console.log('✅ [TransactionsPage][loadTransactions] Total:', this.allTransactions.length);
    }

    catch (error) {
      console.error('🔴 [TransactionsPage][loadTransactions] Error:', error);
      this.errorMessage='No fue posible cargar las transacciones.';
    }

    finally {
      this.loading.set(false);
    }
  } */

		/**
		 * Obtiene transacciones desde Supabase.
		 * Si existe contexto de curso, carga solo las transacciones de ese curso.
		 * Si no existe, carga la lista global.
		 *
		 * @returns {Promise<void>}
		 */
		async loadTransactions(): Promise<void> {
			if (DEBUG) console.log('🔄 [TransactionsPage][loadTransactions] Cargando...');

			this.loading.set(true);
			this.errorMessage = '';

			try {
				if (this.contextCourseId) {
					if (DEBUG) console.log('📘 [TransactionsPage][loadTransactions] Modo contextual por curso:', this.contextCourseId);
					this.allTransactions = await this.transactionsService.getTransactionsByCourse(this.contextCourseId);
				} else {
					if (DEBUG) console.log('🌐 [TransactionsPage][loadTransactions] Modo global');
					this.allTransactions = await this.transactionsService.getTransactions();
				}

				if (DEBUG) console.log('✅ [TransactionsPage][loadTransactions] Total:', this.allTransactions.length); 
				this.resolveContextCourseInfo();
			} catch (error) {
				console.error('🔴 [TransactionsPage][loadTransactions] Error:', error);
				this.errorMessage = 'No fue posible cargar las transacciones.';
			} finally {
				this.loading.set(false);
			}
		}
    /**
		 * Obtiene las categorías activas para poblar el select del formulario.
		 * En modo contextual trae globales + las del colegio del curso.
		 * En modo global trae todas las activas.
		 *
		 * @returns {Promise<void>}
		 */
		async loadActiveCategories(): Promise<void> {
			if (DEBUG) console.log('📂 [TransactionsPage][loadActiveCategories] Cargando categorías activas...');

			try {
				if (this.contextCourseId && this.contextCourseInfo?.school_id) {
					if (DEBUG) console.log('🏫 [TransactionsPage][loadActiveCategories] Modo contextual, school_id:', this.contextCourseInfo.school_id);
					this.activeCategories = await this.categoriesService.getCategoriesBySchool(this.contextCourseInfo.school_id);
				} else {
					this.activeCategories = await this.categoriesService.getActiveCategories();
				}

				if (DEBUG) console.log('✅ [TransactionsPage][loadActiveCategories] Total:', this.activeCategories.length);
			} catch (error) {
				console.error('🔴 [TransactionsPage][loadActiveCategories] Error:', error);
			}
		}

  // ─── Métricas ─────────────────────────────────────────────────────────────────

  /** Total de ingresos de la lista completa. */
  get totalIncome(): number {
    return this.allTransactions.filter(t=> t.type==='income').reduce((s, t)=> s + t.amount, 0);
  }

  /** Total de egresos de la lista completa. */
  get totalExpense(): number {
    return this.allTransactions.filter(t=> t.type==='expense').reduce((s, t)=> s + t.amount, 0);
  }

  /** Balance general (ingresos - egresos). */
  get balance(): number {
    return this.totalIncome - this.totalExpense;
  }

  /** true si el balance es positivo o cero. */
  get isBalancePositive(): boolean {
    return this.balance>=0;
  }

  /** Cantidad de ingresos totales. */
  get incomeCount(): number {
    return this.allTransactions.filter(t=> t.type==='income').length;
  }

  /** Cantidad de egresos totales. */
  get expenseCount(): number {
    return this.allTransactions.filter(t=> t.type==='expense').length;
  }

  // ─── Filtros computed ─────────────────────────────────────────────────────────

  /** Lista filtrada según búsqueda, tipo y rango de fechas. */
  get filteredTransactions(): TransactionListItem[] {
    let result=this.allTransactions;

    if (this.searchTerm.trim()) {
      const term=this.searchTerm.trim().toLowerCase();
      result=result.filter(t=> t.description?.toLowerCase().includes(term) || t.category_name?.toLowerCase().includes(term) || t.notes?.toLowerCase().includes(term));
    }

    if (this.selectedType) {
      result=result.filter(t=> t.type===this.selectedType);
    }

    if (this.dateFrom) {
      result=result.filter(t=> t.transaction_date >=this.dateFrom);
    }

    if (this.dateTo) {
      result=result.filter(t=> t.transaction_date <=this.dateTo);
    }

    return result;
  }

  get totalFiltered(): number {
    return this.filteredTransactions.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalFiltered / this.pageSize);
  }

  get fromRecord(): number {
    return this.totalFiltered===0 ? 0: (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalFiltered);
  }

  get pages(): number[] {
    return Array.from( {
        length: this.totalPages
      }

      , (_, i)=> i + 1);
  }

  get hasActiveFilters(): boolean {
    return ! !(this.searchTerm || this.selectedType || this.dateFrom || this.dateTo);
  }

  get filteredIncome(): number {
    return this.filteredTransactions.filter(t=> t.type==='income').reduce((s, t)=> s + t.amount, 0);
  }

  get filteredExpense(): number {
    return this.filteredTransactions.filter(t=> t.type==='expense').reduce((s, t)=> s + t.amount, 0);
  }

  /** Transacciones de la página actual. */
  get pagedTransactions(): TransactionListItem[] {
    const from=(this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(from, from + this.pageSize);
  }

  // ─── Categorías filtradas por tipo seleccionado ───────────────────────────────

  /**
   * Filtra las categorías activas según el tipo seleccionado en el formulario.
   * Si el tipo cambia, el select de categoría solo muestra las relevantes.
   * @returns {Category[]}
   */
  get categoriesByType(): Category[] {
    const type=this.transactionForm?.get('type')?.value;
    if ( !type) return this.activeCategories;
    return this.activeCategories.filter(c=> c.type===type);
  }

  // ─── Modal nueva transacción ──────────────────────────────────────────────────

  /**
   * Abre el modal de nueva transacción y resetea el formulario.
   */
  /* openCreateModal(): void {
    if (DEBUG) console.log('➕ [TransactionsPage][openCreateModal] Abriendo modal...');

    const today=new Date().toISOString().split('T')[0];

    this.transactionForm.reset( {
				course_id: '',
        type: 'income',
        category_id: '',
        amount: null,
        transaction_date: today,
        description: '',
        notes: '',
      }

    );

    const modalEl=document.getElementById('createTransactionModal');
    if ( !modalEl) return;

    const modal=bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }
 */
  /**
   * Cierra el modal de nueva transacción.
   */
  /* closeCreateModal(): void {
    const modalEl=document.getElementById('createTransactionModal');
    if ( !modalEl) return;
    const modal=bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    if (DEBUG) console.log('🪟 [TransactionsPage][closeCreateModal] Modal cerrado');
  } */

  /**
   * Maneja el cambio de tipo en el formulario.
   * Resetea la categoría seleccionada para evitar categorías de otro tipo.
   */
  onFormTypeChange(): void {
    if (DEBUG) console.log('🔄 [TransactionsPage][onFormTypeChange] tipo:', this.transactionForm.get('type')?.value);
    this.transactionForm.get('category_id')?.setValue('');
  }

  /**
   * Envía el formulario y crea la transacción en Supabase.
   * Al éxito cierra el modal y recarga la tabla + métricas.
   * @returns {Promise<void>}
   */
  async onSubmitCreate(): Promise<void> {
    if (DEBUG) console.log('🚀 [TransactionsPage][onSubmitCreate] Enviando...');

    if (this.transactionForm.invalid) {
      console.warn('⚠️ [TransactionsPage][onSubmitCreate] Formulario inválido');
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      const raw = this.transactionForm.getRawValue();

      const currentUser =
        this.authService.getCurrentUser() ??
        this.authService.getCurrentSession()?.user ??
        null;

      if (DEBUG) {
        console.log('👤 [TransactionsPage][onSubmitCreate] Usuario actual:', currentUser);
      }

      if (!currentUser?.id) {
        throw new Error('No se pudo obtener el usuario autenticado para registrar la transacción.');
      }

      const payload = {
        course_id: raw.course_id,
        category_id: raw.category_id,
        type: raw.type,
        amount: Number(raw.amount),
        description: raw.description?.trim() || null,
        notes: raw.notes?.trim() || null,
        transaction_date: raw.transaction_date,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      };

      if (DEBUG) console.log('📦 [TransactionsPage][onSubmitCreate] Payload:', payload);

      await this.transactionsService.createTransaction(payload);

      if (DEBUG) console.log('✅ [TransactionsPage][onSubmitCreate] Transacción creada');

      this.closeCreateModal();
      await this.loadTransactions();
    } catch (error) {
      console.error('🔴 [TransactionsPage][onSubmitCreate] Error:', error);
    } finally {
      this.saving.set(false);
    }
  }

  // ─── Handlers de filtros y paginación ────────────────────────────────────────

  /** Maneja el input de búsqueda. */
  onSearchInput(): void {
    this.currentPage=1;
  }

  /** Maneja el cambio de filtro tipo. */
  onTypeFilterChange(): void {
    this.currentPage=1;
  }

  /** Maneja el cambio de rango de fechas. */
  onDateFilterChange(): void {
    this.currentPage=1;
  }

  /** Limpia todos los filtros. */
  clearFilters(): void {
    this.searchTerm='';
    this.selectedType='';
    this.dateFrom='';
    this.dateTo='';
    this.currentPage=1;
  }

  /** Navega a una página específica. */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage=page;
  }

  /** Cambia el tamaño de página. */
  onPageSizeChange(): void {
    this.currentPage=1;
  }

  // ─── Helpers de presentación ──────────────────────────────────────────────────

  /**
   * Retorna la etiqueta legible del tipo.
   * @param {string} type
   * @returns {string}
   */
  getTypeLabel(type: string): string {
    return type==='income'? 'Ingreso': 'Egreso';
  }

  /**
   * Retorna el ícono Bootstrap según el tipo.
   * @param {string} type
   * @returns {string}
   */
  getTypeIcon(type: string): string {
    return type==='income'? 'bi-arrow-down-circle-fill': 'bi-arrow-up-circle-fill';
  }

  /**
   * Formatea un monto como moneda CLP.
   * @param {number} amount
   * @returns {string}
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
      }

    ).format(amount);
  }


	/**
	 * Abre el modal principal en modo edición y carga los datos
	 * de la transacción seleccionada en el formulario.
	 *
	 * @param {TransactionListItem} transaction Transacción a editar.
	 * @returns {void}
	 */
	openEditModal(transaction: TransactionListItem): void {
		if (DEBUG) console.log('✏️ [TransactionsPage][openEditModal] Abriendo modal en modo edición...', transaction);

		this.modalMode = 'edit';
		this.selectedTransaction = transaction;

		this.transactionForm.enable();

		this.transactionForm.patchValue({
			course_id: transaction.course_id,
			type: transaction.type,
			category_id: transaction.category_id,
			amount: transaction.amount,
			transaction_date: transaction.transaction_date,
			description: transaction.description || '',
			notes: transaction.notes || '',
		});

		const modalEl = document.getElementById('createTransactionModal');
		if (!modalEl) {
			console.warn('⚠️ [TransactionsPage][openEditModal] No se encontró el modal createTransactionModal');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
		modal.show();

		if (DEBUG) console.log('✅ [TransactionsPage][openEditModal] Modal abierto en modo edición');
	}

	/**
	 * Abre el modal principal en modo solo lectura para visualizar
	 * el detalle de una transacción existente.
	 *
	 * @param {TransactionListItem} transaction Transacción a visualizar.
	 * @returns {void}
	 */
	openViewModal(transaction: TransactionListItem): void {
		if (DEBUG) console.log('👁️ [TransactionsPage][openViewModal] Abriendo modal en modo visualización...', transaction);

		this.modalMode = 'view';
		this.selectedTransaction = transaction;

		this.transactionForm.enable();

		this.transactionForm.patchValue({
			course_id: transaction.course_id,
			type: transaction.type,
			category_id: transaction.category_id,
			amount: transaction.amount,
			transaction_date: transaction.transaction_date,
			description: transaction.description || '',
			notes: transaction.notes || '',
		});

		this.transactionForm.disable();

		const modalEl = document.getElementById('createTransactionModal');
		if (!modalEl) {
			console.warn('⚠️ [TransactionsPage][openViewModal] No se encontró el modal createTransactionModal');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
		modal.show();

		if (DEBUG) console.log('✅ [TransactionsPage][openViewModal] Modal abierto en modo solo lectura');
	}

	/**
	 * Abre el modal principal en modo creación y resetea el formulario.
	 *
	 * @returns {void}
	 */
	openCreateModal(): void {
		if (DEBUG) console.log('➕ [TransactionsPage][openCreateModal] Abriendo modal en modo creación...');

		const today = new Date().toISOString().split('T')[0];

		this.modalMode = 'create';
		this.selectedTransaction = null;
		this.transactionForm.enable();

		this.transactionForm.reset({
			course_id: this.contextCourseId || '',
			type: 'income',
			category_id: '',
			amount: null,
			transaction_date: today,
			description: '',
			notes: '',
		});

		const modalEl = document.getElementById('createTransactionModal');
		if (!modalEl) {
			console.warn('⚠️ [TransactionsPage][openCreateModal] No se encontró el modal createTransactionModal');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
		modal.show();

		if (DEBUG) console.log('✅ [TransactionsPage][openCreateModal] Modal abierto en modo creación');
	}

	/**
	 * Cierra el modal principal y restablece el estado base del formulario.
	 *
	 * @returns {void}
	 */
	closeCreateModal(): void {
		if (DEBUG) console.log('🪟 [TransactionsPage][closeCreateModal] Cerrando modal principal...');

		const modalEl = document.getElementById('createTransactionModal');
		if (!modalEl) {
			console.warn('⚠️ [TransactionsPage][closeCreateModal] No se encontró el modal createTransactionModal');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl);
		if (modal) {
			modal.hide();
		}

		this.transactionForm.enable();
		this.modalMode = 'create';
		this.selectedTransaction = null;

		if (DEBUG) console.log('✅ [TransactionsPage][closeCreateModal] Modal cerrado y estado reiniciado');
	}

	/**
	 * Gestiona el envío del formulario principal según el modo actual:
	 * creación o edición de transacción.
	 *
	 * @returns {Promise<void>}
	 */
	async onSubmitTransaction(): Promise<void> {
		if (DEBUG) console.log('🚀 [TransactionsPage][onSubmitTransaction] Enviando formulario. Modo actual:', this.modalMode);

		if (this.transactionForm.invalid) {
			console.warn('⚠️ [TransactionsPage][onSubmitTransaction] Formulario inválido');
			this.transactionForm.markAllAsTouched();
			return;
		}

		if (this.modalMode === 'create') {
			if (DEBUG) console.log('🆕 [TransactionsPage][onSubmitTransaction] Redirigiendo a creación');
			await this.onSubmitCreate();
			return;
		}

		if (this.modalMode === 'edit') {
			if (DEBUG) console.log('✏️ [TransactionsPage][onSubmitTransaction] Redirigiendo a actualización');
			await this.onSubmitUpdate();
			return;
		}

		if (DEBUG) console.warn('⚠️ [TransactionsPage][onSubmitTransaction] El modo view no permite submit');
	}

	/**
	 * Actualiza una transacción existente en Supabase utilizando
	 * la transacción actualmente seleccionada.
	 *
	 * @returns {Promise<void>}
	 */
	async onSubmitUpdate(): Promise<void> {
		if (DEBUG) console.log('✏️ [TransactionsPage][onSubmitUpdate] Iniciando actualización...');

		if (!this.selectedTransaction?.id) {
			console.warn('⚠️ [TransactionsPage][onSubmitUpdate] No existe transacción seleccionada');
			return;
		}

		if (this.transactionForm.invalid) {
			console.warn('⚠️ [TransactionsPage][onSubmitUpdate] Formulario inválido');
			this.transactionForm.markAllAsTouched();
			return;
		}

		this.saving.set(true);

		try {
			const raw = this.transactionForm.getRawValue();

			const currentUser =
				this.authService.getCurrentUser() ??
				this.authService.getCurrentSession()?.user ??
				null;

			if (DEBUG) console.log('👤 [TransactionsPage][onSubmitUpdate] Usuario actual:', currentUser);

			if (!currentUser?.id) {
				throw new Error('No se pudo obtener el usuario autenticado para actualizar la transacción.');
			}

			const payload = {
				course_id: raw.course_id,
				category_id: raw.category_id,
				type: raw.type,
				amount: Number(raw.amount),
				description: raw.description?.trim() || null,
				notes: raw.notes?.trim() || null,
				transaction_date: raw.transaction_date,
				updated_by: currentUser.id,
			};

			if (DEBUG) {
				console.log('🆔 [TransactionsPage][onSubmitUpdate] ID transacción:', this.selectedTransaction.id);
				console.log('📦 [TransactionsPage][onSubmitUpdate] Payload:', payload);
			}

			await this.transactionsService.updateTransaction(this.selectedTransaction.id, payload);

			if (DEBUG) console.log('✅ [TransactionsPage][onSubmitUpdate] Transacción actualizada correctamente');

			this.closeCreateModal();
			await this.loadTransactions();
		} catch (error) {
			console.error('🔴 [TransactionsPage][onSubmitUpdate] Error:', error);
		} finally {
			this.saving.set(false);
		}
	}

	 async updateTransaction(): Promise<void> {
		if (!this.selectedTransaction) return;

		this.saving.set(true);

		try {
			const raw = this.transactionForm.getRawValue();

			const payload = {
				...raw,
				amount: Number(raw.amount),
				updated_by: this.authService.getCurrentUser()?.id
			};

			await this.transactionsService.updateTransaction(this.selectedTransaction.id, payload);

			this.closeCreateModal();
			await this.loadTransactions();

		} catch (error) {
			console.error('🔴 update error:', error);
		} finally {
			this.saving.set(false);
		}
	}

	/**
	 * Abre el flujo de eliminación para una transacción.
	 * Por ahora utiliza confirm nativo del navegador.
	 *
	 * @param {TransactionListItem} transaction Transacción a eliminar.
	 * @returns {Promise<void>}
	 */
	async openDeleteModal(transaction: TransactionListItem): Promise<void> {
		if (DEBUG) console.log('🗑️ [TransactionsPage][openDeleteModal] Intentando eliminar...', transaction);

		const confirmDelete = confirm(`¿Seguro que quieres eliminar esta transacción de ${this.formatAmount(transaction.amount)}?`);

		if (!confirmDelete) {
			if (DEBUG) console.log('ℹ️ [TransactionsPage][openDeleteModal] Eliminación cancelada por el usuario');
			return;
		}

		try {
			await this.transactionsService.deleteTransaction(transaction.id);

			if (DEBUG) console.log('✅ [TransactionsPage][openDeleteModal] Transacción eliminada');

			await this.loadTransactions();
		} catch (error) {
			console.error('🔴 [TransactionsPage][openDeleteModal] Error al eliminar:', error);
		}
	}

	/**
	 * Limpia un valor monetario eliminando todo carácter que no sea numérico.
	 *
	 * @param {string} value Valor ingresado en el input.
	 * @returns {string} Valor limpio, solo con dígitos.
	 */
	private sanitizeAmountValue(value: string): string {
		if (DEBUG) console.log('🧹 [TransactionsPage][sanitizeAmountValue] Valor original:', value);

		const sanitized = (value || '').replace(/\D/g, '');

		if (DEBUG) console.log('✅ [TransactionsPage][sanitizeAmountValue] Valor limpio:', sanitized);

		return sanitized;
	}

	/**
	 * Formatea un string numérico con separación de miles en formato chileno.
	 *
	 * @param {string} value Valor numérico limpio.
	 * @returns {string} Valor formateado con puntos de miles.
	 */
	public formatAmountInputValue(value: string): string {
		if (DEBUG) console.log('🎨 [TransactionsPage][formatAmountInputValue] Valor recibido:', value);

		if (!value) {
			if (DEBUG) console.log('ℹ️ [TransactionsPage][formatAmountInputValue] Valor vacío');
			return '';
		}

		const numericValue = Number(value);

		if (isNaN(numericValue)) {
			console.warn('⚠️ [TransactionsPage][formatAmountInputValue] Valor no numérico:', value);
			return '';
		}

		const formatted = new Intl.NumberFormat('es-CL', {
			maximumFractionDigits: 0
		}).format(numericValue);

		if (DEBUG) console.log('✅ [TransactionsPage][formatAmountInputValue] Valor formateado:', formatted);

		return formatted;
	}

	/**
	 * Maneja el input del monto, limpiando caracteres no numéricos
	 * y aplicando separación de miles en el campo visual.
	 *
	 * @param {Event} event Evento input del campo monto.
	 * @returns {void}
	 */
	onAmountInput(event: Event): void {
		const input = event.target as HTMLInputElement;

		if (DEBUG) console.log('💰 [TransactionsPage][onAmountInput] Input original:', input?.value);

		const sanitizedValue = this.sanitizeAmountValue(input.value);
		const formattedValue = this.formatAmountInputValue(sanitizedValue);

		input.value = formattedValue;

		this.transactionForm.get('amount')?.setValue(sanitizedValue, {
			emitEvent: false
		});

		if (DEBUG) {
			console.log('✅ [TransactionsPage][onAmountInput] Valor visual:', formattedValue);
			console.log('✅ [TransactionsPage][onAmountInput] Valor form:', sanitizedValue);
		}
	}

	/**
 * Abre el modal de confirmación de eliminación para la transacción seleccionada.
 *
 * @param {TransactionListItem} transaction Transacción a eliminar.
 * @returns {void}
 */
	openDeleteModalDelete(transaction: TransactionListItem): void {
		if (DEBUG) console.log('🗑️ [TransactionsPage][openDeleteModal] Abriendo modal de eliminación...', transaction);

		this.selectedTransaction = transaction;

		const modalEl = document.getElementById('deleteTransactionModal');
		if (!modalEl) {
			console.warn('⚠️ [TransactionsPage][openDeleteModal] No se encontró el modal deleteTransactionModal');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
		modal.show();

		if (DEBUG) console.log('✅ [TransactionsPage][openDeleteModal] Modal de eliminación abierto');
	}

	/**
	 * Cierra el modal de confirmación de eliminación y limpia la transacción seleccionada.
	 *
	 * @returns {void}
	 */
	closeDeleteModal(): void {
		if (DEBUG) console.log('🪟 [TransactionsPage][closeDeleteModal] Cerrando modal de eliminación...');

		const modalEl = document.getElementById('deleteTransactionModal');
		if (!modalEl) {
			console.warn('⚠️ [TransactionsPage][closeDeleteModal] No se encontró el modal deleteTransactionModal');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl);
		if (modal) {
			modal.hide();
		}

		this.selectedTransaction = null;

		if (DEBUG) console.log('✅ [TransactionsPage][closeDeleteModal] Modal de eliminación cerrado');
	}

	/**
	 * Elimina la transacción actualmente seleccionada desde Supabase.
	 * Al éxito, cierra el modal y recarga la tabla.
	 *
	 * @returns {Promise<void>}
	 */
	async confirmDeleteTransaction(): Promise<void> {
		if (DEBUG) console.log('🚨 [TransactionsPage][confirmDeleteTransaction] Confirmando eliminación...');

		if (!this.selectedTransaction?.id) {
			console.warn('⚠️ [TransactionsPage][confirmDeleteTransaction] No existe transacción seleccionada');
			return;
		}

		this.deleting.set(true);

		try {
			if (DEBUG) {
				console.log('🆔 [TransactionsPage][confirmDeleteTransaction] ID transacción:', this.selectedTransaction.id);
				console.log('📦 [TransactionsPage][confirmDeleteTransaction] Transacción seleccionada:', this.selectedTransaction);
			}

			await this.transactionsService.deleteTransaction(this.selectedTransaction.id);

			this.toastService.show('Transacción eliminada correctamente 🗑️', 'success');

			if (DEBUG) console.log('✅ [TransactionsPage][confirmDeleteTransaction] Transacción eliminada correctamente');

			this.closeDeleteModal();
			await this.loadTransactions();
		} catch (error) {
			console.error('🔴 [TransactionsPage][confirmDeleteTransaction] Error al eliminar:', error);
		} finally {
			this.deleting.set(false);
		}
	}

	 /**
	 * Resuelve la información del curso contextual actual.
	 * Prioriza los datos de las transacciones cargadas y luego usa
	 * la lista de cursos activos como respaldo.
	 *
	 * @returns {void}
	 */
	private resolveContextCourseInfo(): void {
		if (DEBUG) console.log('🧭 [TransactionsPage][resolveContextCourseInfo] Resolviendo curso contextual...');

		if (!this.contextCourseId) {
			this.contextCourseInfo = null;
			if (DEBUG) console.log('ℹ️ [TransactionsPage][resolveContextCourseInfo] Sin contextCourseId');
			return;
		}

		// 1. Intentar resolver desde las transacciones cargadas
		const transactionMatch = this.allTransactions.find(
			transaction => transaction.course_id === this.contextCourseId
		);

		if (transactionMatch) {
			this.contextCourseInfo = {
				id: transactionMatch.course_id,
				name: transactionMatch.course_name || 'Sin curso',
				school_name: transactionMatch.school_name || 'Sin colegio',
				school_year: transactionMatch.school_year ?? null,
				school_id: transactionMatch.school_id ?? null,
			};

			if (DEBUG) {
				console.log('✅ [TransactionsPage][resolveContextCourseInfo] Resuelto desde allTransactions:', this.contextCourseInfo);
			}
			return;
		}

		// 2. Intentar resolver desde cursos activos
		const courseMatch = this.activeCourses.find(
			course => course.id === this.contextCourseId
		);

		if (courseMatch) {
			this.contextCourseInfo = {
				id: courseMatch.id,
				name: courseMatch.name,
				school_name: courseMatch.schools?.name || 'Sin colegio',
				school_year: courseMatch.school_year ?? null,
				school_id: courseMatch.school_id ?? null,
			};

			if (DEBUG) {
				console.log('✅ [TransactionsPage][resolveContextCourseInfo] Resuelto desde activeCourses:', this.contextCourseInfo);
			}
			return;
		}

		// 3. No encontrado
		this.contextCourseInfo = null;

		if (DEBUG) {
			console.warn('⚠️ [TransactionsPage][resolveContextCourseInfo] No se pudo resolver el curso contextual');
		}
	}

	/**
	 * Navega de vuelta al listado de cursos.
	 * Solo aplica en modo contextual.
	 */
	goBackToCourses(): void {
		if (DEBUG) console.log('🔙 [TransactionsPage] Volviendo a /dashboard/courses');

		this.router.navigate(['/dashboard/courses']);
	}

 
	// ─── Modal comprobante ────────────────────────────────────────────────────────

	/**
	 * Abre el modal de comprobante para la transacción seleccionada.
	 * Busca si ya existe un comprobante en Supabase y carga la URL firmada.
	 *
	 * @param {TransactionListItem} transaction Transacción seleccionada.
	 * @returns {Promise<void>}
	 */
	async openReceiptModal(transaction: TransactionListItem): Promise<void> {
			if (DEBUG) console.log('📎 [TransactionsPage][openReceiptModal] Abriendo modal comprobante...', transaction.id);

			this.selectedTransaction = transaction;
			this.currentReceipt.set(null);
			this.selectedFile.set(null);
			this.receiptSignedUrl.set(null);
			this.loadingReceipt.set(true);

			const modalEl = document.getElementById('receiptModal');
			if (!modalEl) {
					console.warn('⚠️ [TransactionsPage][openReceiptModal] No se encontró receiptModal');
					return;
			}

			const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
			modal.show();

			try {
					const receipts = await this.receiptsService.getReceiptsByTransaction(transaction.id);
					if (DEBUG) console.log('✅ [TransactionsPage][openReceiptModal] Comprobantes encontrados:', receipts.length);

					if (receipts.length > 0) {
    const receipt = receipts[0];

    try {
        const url = await this.receiptsService.getSignedUrl(receipt.file_path);
        this.currentReceipt.set(receipt);
        this.receiptSignedUrl.set(url);
        if (DEBUG) console.log('✅ [TransactionsPage][openReceiptModal] URL firmada obtenida');
    } catch (urlError) {
        console.warn('⚠️ [TransactionsPage][openReceiptModal] Archivo no encontrado en Storage, limpiando registro huérfano...');
        // Eliminar registro huérfano de la tabla
        await this.receiptsService.deleteReceipt(receipt.id, receipt.file_path);
        this.currentReceipt.set(null);
        this.receiptSignedUrl.set(null);
    }
}
			} catch (error) {
					console.error('🔴 [TransactionsPage][openReceiptModal] Error:', error);
			} finally {
					this.loadingReceipt.set(false);
			}
	}

	/**
	 * Cierra el modal de comprobante y limpia el estado.
	 *
	 * @returns {void}
	 */
	closeReceiptModal(): void {
			if (DEBUG) console.log('🪟 [TransactionsPage][closeReceiptModal] Cerrando modal...');

			const modalEl = document.getElementById('receiptModal');
			if (!modalEl) return;

			const modal = bootstrap.Modal.getInstance(modalEl);
			if (modal) modal.hide();

			this.currentReceipt.set(null);
			this.selectedFile.set(null);
			this.receiptSignedUrl.set(null);
			this.selectedTransaction = null;

			if (DEBUG) console.log('✅ [TransactionsPage][closeReceiptModal] Modal cerrado y estado limpiado');
	}

	/**
	 * Captura el archivo seleccionado en el input file.
	 *
	 * @param {Event} event Evento change del input file.
	 * @returns {void}
	 */
	onFileSelected(event: Event): void {
			const input = event.target as HTMLInputElement;
			const file = input.files?.[0] ?? null;

			if (DEBUG) console.log('📁 [TransactionsPage][onFileSelected] Archivo seleccionado:', file?.name);

			this.selectedFile.set(file);
	}

	/**
	 * Sube el archivo seleccionado a Supabase Storage y registra en tabla receipts.
	 *
	 * @returns {Promise<void>}
	 */
	async uploadReceipt(): Promise<void> {
			if (DEBUG) console.log('☁️ [TransactionsPage][uploadReceipt] Iniciando subida...');

			const file = this.selectedFile();
			const transaction = this.selectedTransaction;

			if (!file || !transaction) {
					console.warn('⚠️ [TransactionsPage][uploadReceipt] Falta archivo o transacción');
					return;
			}

			const currentUser =
					this.authService.getCurrentUser() ??
					this.authService.getCurrentSession()?.user ??
					null;

			if (!currentUser?.id) {
					console.error('🔴 [TransactionsPage][uploadReceipt] No hay usuario autenticado');
					return;
			}

			this.uploadingReceipt.set(true);

			try {
					const schoolId = transaction.school_id ?? 'sin-colegio';
					const courseId = transaction.course_id;

					const receipt = await this.receiptsService.uploadReceipt(
							file,
							transaction.id,
							courseId,
							schoolId,
							currentUser.id
					);

					if (DEBUG) console.log('✅ [TransactionsPage][uploadReceipt] Comprobante subido:', receipt);

					this.currentReceipt.set(receipt);
					this.selectedFile.set(null);

					const url = await this.receiptsService.getSignedUrl(receipt.file_path);
					this.receiptSignedUrl.set(url);

					this.toastService.show('Comprobante subido correctamente 📎', 'success');

					// Recargar tabla para actualizar ícono has_receipt
					await this.loadTransactions();
			} catch (error) {
					console.error('🔴 [TransactionsPage][uploadReceipt] Error:', error);
					this.toastService.show('Error al subir el comprobante', 'error');
			} finally {
					this.uploadingReceipt.set(false);
			}
	}

	/**
	 * Abre el comprobante actual en una nueva pestaña.
	 * Funciona para imágenes y PDFs usando la URL firmada.
	 *
	 * @returns {void}
	 */
	openReceiptFile(): void {
			const url = this.receiptSignedUrl();
			if (DEBUG) console.log('🔗 [TransactionsPage][openReceiptFile] Abriendo URL:', url);

			if (!url) {
					console.warn('⚠️ [TransactionsPage][openReceiptFile] No hay URL disponible');
					return;
			}

			window.open(url, '_blank');
	}

	/**
	 * Elimina el comprobante actual de Storage y de la tabla receipts.
	 *
	 * @returns {Promise<void>}
	 */
	async deleteReceipt(): Promise<void> {
			if (DEBUG) console.log('🗑️ [TransactionsPage][deleteReceipt] Eliminando comprobante...');

			const receipt = this.currentReceipt();
			if (!receipt) {
					console.warn('⚠️ [TransactionsPage][deleteReceipt] No hay comprobante seleccionado');
					return;
			}

			this.deletingReceipt.set(true);

			try {
					await this.receiptsService.deleteReceipt(receipt.id, receipt.file_path);

					if (DEBUG) console.log('✅ [TransactionsPage][deleteReceipt] Comprobante eliminado');

					this.currentReceipt.set(null);
					this.receiptSignedUrl.set(null);

					this.toastService.show('Comprobante eliminado correctamente 🗑️', 'success');

					// Recargar tabla para actualizar ícono has_receipt
					await this.loadTransactions();
			} catch (error) {
					console.error('🔴 [TransactionsPage][deleteReceipt] Error:', error);
					this.toastService.show('Error al eliminar el comprobante', 'error');
			} finally {
					this.deletingReceipt.set(false);
			}
	}
		
}