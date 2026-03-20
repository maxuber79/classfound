import { Component, OnInit, OnDestroy, inject, signal } from "@angular/core";
import { CommonModule, DatePipe, NgClass } from "@angular/common";
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";

import { AdminUsersService } from "../../services/admin-users.service";
import { AdminUser } from "../../models/admin-user.interface";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";

declare var bootstrap: any;
const DEBUG = true;

@Component({
  selector: "app-users-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    NgClass,
    CommonModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: "./users-page.html",
  styleUrl: "./users-page.scss",
})
export class UsersPage implements OnInit {
  //Formulario para creación de usuario (futuro)
  private readonly fb = inject(FormBuilder);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // ─── Estado de carga ────────────────────────────────────────────────────────
  readonly loading = signal(false);

  // ─── Lista de usuarios ───────────────────────────────────────────────────────
  users: AdminUser[] = [];

  // ─── Filtros ─────────────────────────────────────────────────────────────────
  searchTerm: string = "";
  selectedRole: string = "";
  selectedStatus: string = "";

  // ─── Paginación ──────────────────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 5;
  totalUsers: number = 0;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  // ─── Formularios ─────────────────────────────────────────────────────────────
  createUserForm!: FormGroup;
  isCreatingUser: boolean = false;

  selectedUser: AdminUser | null = null;
  editUserForm!: FormGroup;
  isEditingUser: boolean = false;

  /* users: AdminUser[] = [];
	createUserForm!: FormGroup;
	isCreatingUser: boolean = false;

	//Estados del usuario al editar
	selectedUser: AdminUser | null = null;
	editUserForm!: FormGroup;
	isEditingUser: boolean = false; */

  // ─── Computed ────────────────────────────────────────────────────────────────

  /**
   * Retorna el número total de páginas según el total de usuarios y pageSize.
   * @returns {number}
   */
  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.pageSize);
  }

  /**
   * Retorna el índice del primer usuario mostrado en la página actual.
   * @returns {number}
   */
  get fromRecord(): number {
    if (this.totalUsers === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /**
   * Retorna el índice del último usuario mostrado en la página actual.
   * @returns {number}
   */
  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }

  /**
   * Retorna el array de números de página para renderizar la paginación.
   * @returns {number[]}
   */
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización del componente.
   * Se ejecuta una vez al cargar la vista y dispara la carga de usuarios.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log("📄 [UsersPage][ngOnInit] Inicializando...");

    this.initCreateUserForm();
    this.initEditUserForm();
    this.setupSearchDebounce();
    await this.loadUsers();
  }

  /**
   * Hook de destrucción. Limpia subscripciones para evitar memory leaks.
   */
  ngOnDestroy(): void {
    if (DEBUG)
      console.log("🧹 [UsersPage][ngOnDestroy] Limpiando subscripciones");
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────

  /**
   * Configura el debounce del campo de búsqueda.
   * Espera 400ms después del último keystroke antes de ejecutar la búsqueda.
   */
  private setupSearchDebounce(): void {
    if (DEBUG)
      console.log(
        "⏱️ [UsersPage][setupSearchDebounce] Configurando debounce...",
      );

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        if (DEBUG) console.log("🔍 [UsersPage][searchDebounce] Término:", term);
        this.searchTerm = term;
        this.currentPage = 1;
        this.loadUsers();
      });
  }

  /**
   * Inicializa el formulario reactivo para creación de usuarios.
   *
   * @returns {void}
   */
  initCreateUserForm(): void {
    if (DEBUG) console.log('🧩 [UsersPage][initCreateUserForm] Inicializando...');

    this.createUserForm = this.fb.group({
      first_name: ["", [Validators.required, Validators.minLength(2)]],
      last_name: ["", [Validators.required, Validators.minLength(2)]],
      phone: [""],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
      global_role: ["user", [Validators.required]],
      is_active: [true],
    });

     if (DEBUG) console.log(
      "✅ [UsersPage][initCreateUserForm] Formulario creado:",
      this.createUserForm.value,
    );
  }

  /**
   * Inicializa el formulario reactivo para edición de usuarios.
   *
   * @returns {void}
   */
  initEditUserForm(): void {
    if (DEBUG) console.log('🧩 [UsersPage][initEditUserForm] Inicializando...');

    this.editUserForm = this.fb.group({
      id: [""],
      first_name: ["", [Validators.required, Validators.minLength(2)]],
      last_name: ["", [Validators.required, Validators.minLength(2)]],
      phone: [""],
      email: [{ value: "", disabled: true }],
      global_role: ["user", [Validators.required]],
      is_active: [true],
    });

    if (DEBUG) console.log(
      "✅ [UsersPage][initEditUserForm] Formulario de edición creado:",
      this.editUserForm.getRawValue(),
    );
  }


	// ─── Carga de datos ──────────────────────────────────────────────────────────

  /**
   * Carga la lista de usuarios desde el servicio de administración.
   * @returns {Promise<void>}
   */
  async loadUsers(): Promise<void> {
     if (DEBUG) console.log('📥 [UsersPage][loadUsers] page:', this.currentPage, '| pageSize:', this.pageSize, '| search:', this.searchTerm, '| role:', this.selectedRole, '| status:', this.selectedStatus);

    this.loading.set(true);

    try {
     const result = await this.adminUsersService.getUsers({
        search: this.searchTerm,
        role: this.selectedRole,
        status: this.selectedStatus,
        page: this.currentPage,
        pageSize: this.pageSize
      });

      this.users = result.users;
      this.totalUsers = result.total;

      if (DEBUG) console.log('🟢 [UsersPage][loadUsers] Cargados:', this.users.length, '| Total:', this.totalUsers);
    } catch (error) {
      console.error('🔴 [UsersPage][loadUsers] Error:', error);
    } finally {
      this.loading.set(false);
    }
  }

	// ─── Handlers de filtros ─────────────────────────────────────────────────────

	/**
   * Emite el término de búsqueda al subject con debounce.
   * @param {string} term Texto ingresado en el campo de búsqueda.
   */
  onSearchInput(term: string): void {
    if (DEBUG) console.log('⌨️ [UsersPage][onSearchInput] term:', term);
    this.searchSubject.next(term);
  }

	/**
   * Maneja el cambio del filtro de rol.
   * Resetea la página y recarga.
   */
  onRoleFilterChange(): void {
    if (DEBUG) console.log('🎭 [UsersPage][onRoleFilterChange] rol:', this.selectedRole);
    this.currentPage = 1;
    this.loadUsers();
  }

	/**
   * Maneja el cambio del filtro de estado.
   * Resetea la página y recarga.
   */
  onStatusFilterChange(): void {
    if (DEBUG) console.log('🔘 [UsersPage][onStatusFilterChange] estado:', this.selectedStatus);
    this.currentPage = 1;
    this.loadUsers();
  }

	/**
   * Limpia todos los filtros activos y recarga desde la página 1.
   */
  clearFilters(): void {
    if (DEBUG) console.log('🧹 [UsersPage][clearFilters] Limpiando filtros...');
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadUsers();
  }

	/**
   * Retorna true si hay algún filtro activo.
   * @returns {boolean}
   */
  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedRole || this.selectedStatus);
  }

  // ─── Paginación ──────────────────────────────────────────────────────────────

	/**
   * Navega a una página específica si está dentro del rango válido.
   * @param {number} page Número de página destino.
   */
  goToPage(page: number): void {
    if (DEBUG) console.log('📄 [UsersPage][goToPage] página:', page);

    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;
    this.loadUsers();
  }

	/**
   * Maneja el cambio del selector de registros por página.
   * Resetea a página 1 al cambiar el tamaño.
   */
  onPageSizeChange(): void {
    if (DEBUG) console.log('📏 [UsersPage][onPageSizeChange] pageSize:', this.pageSize);
    this.currentPage = 1;
    this.loadUsers();
  }

	 // ─── Modal editar ────────────────────────────────────────────────────────────
  /**
   * Abre el modal de edición y carga los datos del usuario seleccionado.
   *
   * @param {AdminUser} user Usuario a editar.
   * @returns {void}
   */
  openEditUserModal(user: AdminUser): void {
    if (DEBUG) console.log('✏️ [UsersPage][openEditUserModal] usuario:', user);

    this.selectedUser = user;

    this.editUserForm.patchValue({
      id: user.id,
      first_name: (user as any).first_name || "",
      last_name: (user as any).last_name || "",
      phone: (user as any).phone || "",
      email: user.email,
      global_role: user.global_role,
      is_active: user.is_active,
    });

    if (DEBUG) console.log('🧾 [UsersPage][openEditUserModal] Formulario:', this.editUserForm.getRawValue());
  }

  /**
   * Envía la edición del usuario seleccionado.
   *
   * @returns {Promise<void>}
   */
  async onSubmitEditUser(): Promise<void> {
    if (DEBUG) console.log('🚀 [UsersPage][onSubmitEditUser] Guardando...');

    if (this.editUserForm.invalid) {
      console.warn("⚠️ [UsersPage][onSubmitEditUser] Formulario inválido");
      this.editUserForm.markAllAsTouched();
      return;
    }

    this.isEditingUser = true;

    try {
      const raw = this.editUserForm.getRawValue();

      const payload = {
        ...raw,
        full_name: `${raw.first_name} ${raw.last_name}`.trim(),
      };

      if (DEBUG) console.log('📦 [UsersPage][onSubmitEditUser] Payload:', payload);

      await this.adminUsersService.updateUserProfile(payload);

      if (DEBUG) console.log('✅ [UsersPage][onSubmitEditUser] Actualizado correctamente');

      this.closeEditUserModal();
      await this.loadUsers();
    } catch (error) {
      console.error('🔴 [UsersPage][onSubmitEditUser] Error:', error);
    } finally {
      this.isEditingUser = false;
    }
  }

	/**
   * Cierra el modal de edición de usuario.
   *
   * @returns {void}
   */
  closeEditUserModal(): void {
     const modalElement = document.getElementById('editUserModal');
    if (!modalElement) return;
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
    if (DEBUG) console.log('🪟 [UsersPage][closeEditUserModal] Modal cerrado');
  }

  /**
   * Maneja el submit del formulario de creación.
   *
   * IMPORTANTE:
   * Por ahora solo valida y muestra trazabilidad en consola.
   * La conexión real con backend seguro / Edge Function se hará después.
   *
   * @returns {Promise<void>}
   */
  async onSubmitCreateUser(): Promise<void> {
   if (DEBUG) console.log('🚀 [UsersPage][onSubmitCreateUser] Enviando...');

    if (this.createUserForm.invalid) {
      console.warn("⚠️ [UsersPage][onSubmitCreateUser] Formulario inválido");
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.isCreatingUser = true;

    try {
      const raw = this.createUserForm.getRawValue();

      const payload = {
        ...raw,
        full_name: `${raw.first_name} ${raw.last_name}`.trim(),
      };

      if (DEBUG) console.log('📦 [UsersPage][onSubmitCreateUser] Payload:', payload);

      await this.adminUsersService.createUser(payload);

      if (DEBUG) console.log('✅ [UsersPage][onSubmitCreateUser] Usuario creado');

      this.createUserForm.reset({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        password: "",
        global_role: "user",
        is_active: true,
      });

      this.closeCreateUserModal();
      await this.loadUsers();
    } catch (error) {
      console.error('🔴 [UsersPage][onSubmitCreateUser] Error:', error);
    } finally {
      this.loading.set(false);
      this.isCreatingUser = false;
    }
  }

  

  /**
   * Cierra el modal de creación de usuario.
   */
  closeCreateUserModal(): void {
   const modalEl = document.getElementById('createUserModal');
    if (!modalEl) return;
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    if (DEBUG) console.log('🪟 [UsersPage][closeCreateUserModal] Modal cerrado');
  }

	// ─── Toggle estado ───────────────────────────────────────────────────────────

	/**
   * Cambia el estado activo/inactivo de un usuario desde la UI.
   *
   * Si el usuario está activo, solicita confirmación antes de deshabilitarlo.
   *
   * @param {AdminUser} user Usuario seleccionado
   * @returns {Promise<void>}
   */
  async toggleStatus(user: AdminUser): Promise<void> {
    if (DEBUG) console.log('🧠 [UsersPage][toggleStatus] usuario:', user.email);

    if (user.is_active) {
      const confirmed = window.confirm(`¿Seguro que deseas desactivar a "${user.full_name || user.email}"?`);
      if (!confirmed) return;
    }

    try {
      await this.adminUsersService.toggleUserStatus(user.id, user.is_active);
      if (DEBUG) console.log('🔄 [UsersPage][toggleStatus] Refrescando lista...');
      await this.loadUsers();
    } catch (error) {
      console.error('❌ [UsersPage][toggleStatus] Error:', error);
    }
  }

	// ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Retorna el label legible del rol global del usuario.
   *
   * @param {string} role Rol global del usuario.
   * @returns {string} Texto legible del rol.
   */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      user: "Usuario",
    };

    return labels[role] ?? role;
  }

  /**
   * Retorna el ícono Bootstrap correspondiente al rol global.
   *
   * @param {string} role Rol global del usuario.
   * @returns {string} Clase del ícono Bootstrap.
   */
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      super_admin: "bi-shield-fill",
      user: "bi-person",
    };

    return icons[role] ?? "bi-person";
  }

  /**
   * Retorna la inicial del nombre o email del usuario para el avatar.
   * @param user Usuario del que se extrae la inicial
   */
  getInitial(user: AdminUser): string {
    return (user.full_name || user.email).charAt(0).toUpperCase();
  }

  

  /**
   * Maneja el cambio de rol desde la UI.
   *
   * @param {AdminUser} user Usuario seleccionado
   * @param {Event} event Evento del select
   */
  async onRoleChange(user: AdminUser, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value;

    console.log("🎭 [UsersPage][onRoleChange] Cambio detectado");
    console.log("👉 Usuario:", user.email);
    console.log("👉 Nuevo rol:", newRole);

    try {
      await this.adminUsersService.updateUserRole(user.id, newRole);

      console.log("🔄 Refrescando lista...");
      await this.loadUsers();
    } catch (error) {
      console.error("❌ Error al cambiar rol:", error);
    }
  }
}
