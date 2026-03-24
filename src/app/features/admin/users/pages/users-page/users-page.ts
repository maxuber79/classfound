import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminUsersService } from '../../services/admin-users.service';
import { AdminUser } from '../../models/admin-user.interface';

declare var bootstrap: any;
const DEBUG = true;

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, NgClass, CommonModule],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // ─── Estado de carga ─────────────────────────────────────────────────────────
  readonly loading = signal(false);

  // ─── Lista de usuarios ────────────────────────────────────────────────────────
  users: AdminUser[] = [];

  // ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';

  // ─── Paginación ───────────────────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 5;
  totalUsers: number = 0;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  // ─── Formularios ──────────────────────────────────────────────────────────────
  createUserForm!: FormGroup;
  isCreatingUser: boolean = false;

  selectedUser: AdminUser | null = null;
  editUserForm!: FormGroup;
  isEditingUser: boolean = false;

  // ─── Modo del modal de usuario (ver / editar) ─────────────────────────────────
  isViewMode: boolean = true;

  // ─── Computed ─────────────────────────────────────────────────────────────────

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

  /**
   * Retorna true si hay algún filtro activo.
   * @returns {boolean}
   */
  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedRole || this.selectedStatus);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización. Configura formularios, debounce de búsqueda y carga inicial.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [UsersPage][ngOnInit] Inicializando...');
    this.initCreateUserForm();
    this.initEditUserForm();
    this.setupSearchDebounce();
    await this.loadUsers();
  }

  /**
   * Hook de destrucción. Limpia subscripciones para evitar memory leaks.
   */
  ngOnDestroy(): void {
    if (DEBUG) console.log('🧹 [UsersPage][ngOnDestroy] Limpiando subscripciones');
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Setup ────────────────────────────────────────────────────────────────────

  /**
   * Configura el debounce del campo de búsqueda.
   * Espera 400ms después del último keystroke antes de ejecutar la búsqueda.
   */
  private setupSearchDebounce(): void {
    if (DEBUG) console.log('⏱️ [UsersPage][setupSearchDebounce] Configurando debounce...');
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      if (DEBUG) console.log('🔍 [UsersPage][searchDebounce] Término:', term);
      this.searchTerm = term;
      this.currentPage = 1;
      this.loadUsers();
    });
  }

  /**
   * Inicializa el formulario reactivo para creación de usuarios.
   */
  initCreateUserForm(): void {
    if (DEBUG) console.log('🧩 [UsersPage][initCreateUserForm] Inicializando...');
    this.createUserForm = this.fb.group({
      first_name:  ['', [Validators.required, Validators.minLength(2)]],
      last_name:   ['', [Validators.required, Validators.minLength(2)]],
      phone:       [''],
      email:       ['', [Validators.required, Validators.email]],
      password:    ['', [Validators.required, Validators.minLength(6)]],
      global_role: ['user', [Validators.required]],
      is_active:   [true],
    });
    if (DEBUG) console.log('✅ [UsersPage][initCreateUserForm] Formulario creado:', this.createUserForm.value);
  }

  /**
   * Inicializa el formulario reactivo para edición/visualización de usuarios.
   * El email siempre queda deshabilitado — no es editable.
   */
  initEditUserForm(): void {
    if (DEBUG) console.log('🧩 [UsersPage][initEditUserForm] Inicializando...');
    this.editUserForm = this.fb.group({
      id:          [''],
      first_name:  ['', [Validators.required, Validators.minLength(2)]],
      last_name:   ['', [Validators.required, Validators.minLength(2)]],
      phone:       [''],
      email:       [{ value: '', disabled: true }],
      global_role: ['user', [Validators.required]],
      is_active:   [true],
    });
    if (DEBUG) console.log('✅ [UsersPage][initEditUserForm] Formulario creado:', this.editUserForm.getRawValue());
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────────

  /**
   * Carga la lista paginada de usuarios aplicando filtros activos.
   * @returns {Promise<void>}
   */
  async loadUsers(): Promise<void> {
    if (DEBUG) console.log('📥 [UsersPage][loadUsers] page:', this.currentPage, '| pageSize:', this.pageSize, '| search:', this.searchTerm, '| role:', this.selectedRole, '| status:', this.selectedStatus);
    this.loading.set(true);
    try {
      const result = await this.adminUsersService.getUsers({
        search:   this.searchTerm,
        role:     this.selectedRole,
        status:   this.selectedStatus,
        page:     this.currentPage,
        pageSize: this.pageSize,
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

  // ─── Handlers de filtros ──────────────────────────────────────────────────────

  /**
   * Emite el término de búsqueda al subject con debounce.
   * @param {string} term Texto ingresado en el campo de búsqueda.
   */
  onSearchInput(term: string): void {
    if (DEBUG) console.log('⌨️ [UsersPage][onSearchInput] term:', term);
    this.searchSubject.next(term);
  }

  /**
   * Maneja el cambio del filtro de rol. Resetea la página y recarga.
   */
  onRoleFilterChange(): void {
    if (DEBUG) console.log('🎭 [UsersPage][onRoleFilterChange] rol:', this.selectedRole);
    this.currentPage = 1;
    this.loadUsers();
  }

  /**
   * Maneja el cambio del filtro de estado. Resetea la página y recarga.
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

  // ─── Paginación ───────────────────────────────────────────────────────────────

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
   * Maneja el cambio del selector de registros por página. Resetea a página 1.
   */
  onPageSizeChange(): void {
    if (DEBUG) console.log('📏 [UsersPage][onPageSizeChange] pageSize:', this.pageSize);
    this.currentPage = 1;
    this.loadUsers();
  }

  // ─── Modal usuario (ver / editar) ─────────────────────────────────────────────

  /**
   * Carga los datos del usuario seleccionado en el formulario del modal.
   * Método privado compartido por openViewUserModal y openEditUserModal.
   * @param {AdminUser} user Usuario a cargar.
   */
  private loadUserIntoForm(user: AdminUser): void {
    this.selectedUser = user;
    this.editUserForm.patchValue({
      id:          user.id,
      first_name:  (user as any).first_name || '',
      last_name:   (user as any).last_name  || '',
      phone:       (user as any).phone      || '',
      email:       user.email,
      global_role: user.global_role,
      is_active:   user.is_active,
    });
    if (DEBUG) console.log('🧾 [UsersPage][loadUserIntoForm] Formulario:', this.editUserForm.getRawValue());
  }

  /**
   * Abre el modal en modo visualización (campos deshabilitados).
   * @param {AdminUser} user Usuario a visualizar.
   */
  openViewUserModal(user: AdminUser): void {
    if (DEBUG) console.log('👁️ [UsersPage][openViewUserModal] usuario:', user);
    this.isViewMode = true;
    this.loadUserIntoForm(user);
    this.editUserForm.disable();
    this.openUserModal();
  }

  /**
   * Abre el modal directamente en modo edición (campos habilitados).
   * @param {AdminUser} user Usuario a editar.
   */
  openEditUserModal(user: AdminUser): void {
    if (DEBUG) console.log('✏️ [UsersPage][openEditUserModal] usuario:', user);
    this.isViewMode = false;
    this.loadUserIntoForm(user);
    this.editUserForm.enable();
    this.editUserForm.get('email')?.disable(); // email nunca editable
    this.openUserModal();
  }

  /**
   * Cambia desde modo visualización a modo edición habilitando los campos del formulario.
   */
  enableEditMode(): void {
    if (DEBUG) console.log('🛠️ [UsersPage][enableEditMode] Activando edición');
    this.isViewMode = false;
    this.editUserForm.enable();
    this.editUserForm.get('email')?.disable();
  }

  /**
   * Instancia y muestra el modal de usuario.
   * Método privado compartido por openViewUserModal y openEditUserModal.
   */
  private openUserModal(): void {
    const modalElement = document.getElementById('userModal');
    if (!modalElement) return;
    const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
    modalInstance.show();
  }

  /**
   * Cierra el modal de usuario y resetea el modo a visualización.
   */
  closeUserModal(): void {
    const modalElement = document.getElementById('userModal');
    if (!modalElement) return;
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) modalInstance.hide();
    this.isViewMode = true;
    if (DEBUG) console.log('🪟 [UsersPage][closeUserModal] Modal cerrado');
  }

  /**
   * Envía los cambios del formulario de edición al servicio.
   * Solo se ejecuta si el formulario es válido y está en modo edición.
   * @returns {Promise<void>}
   */
  async onSubmitEditUser(): Promise<void> {
    if (DEBUG) console.log('🚀 [UsersPage][onSubmitEditUser] Guardando...');
    if (this.editUserForm.invalid) {
      console.warn('⚠️ [UsersPage][onSubmitEditUser] Formulario inválido');
      this.editUserForm.markAllAsTouched();
      return;
    }
    this.isEditingUser = true;
    try {
      const raw = this.editUserForm.getRawValue();
      const payload = { ...raw, full_name: `${raw.first_name} ${raw.last_name}`.trim() };
      if (DEBUG) console.log('📦 [UsersPage][onSubmitEditUser] Payload:', payload);
      await this.adminUsersService.updateUserProfile(payload);
      if (DEBUG) console.log('✅ [UsersPage][onSubmitEditUser] Actualizado correctamente');
      this.closeUserModal();
      await this.loadUsers();
    } catch (error) {
      console.error('🔴 [UsersPage][onSubmitEditUser] Error:', error);
    } finally {
      this.isEditingUser = false;
    }
  }

  // ─── Modal crear usuario ──────────────────────────────────────────────────────

  /**
   * Envía el formulario de creación de usuario al servicio.
   * @returns {Promise<void>}
   */
  async onSubmitCreateUser(): Promise<void> {
    if (DEBUG) console.log('🚀 [UsersPage][onSubmitCreateUser] Enviando...');
    if (this.createUserForm.invalid) {
      console.warn('⚠️ [UsersPage][onSubmitCreateUser] Formulario inválido');
      this.createUserForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.isCreatingUser = true;
    try {
      const raw = this.createUserForm.getRawValue();
      const payload = { ...raw, full_name: `${raw.first_name} ${raw.last_name}`.trim() };
      if (DEBUG) console.log('📦 [UsersPage][onSubmitCreateUser] Payload:', payload);
      await this.adminUsersService.createUser(payload);
      if (DEBUG) console.log('✅ [UsersPage][onSubmitCreateUser] Usuario creado');
      this.createUserForm.reset({ first_name: '', last_name: '', phone: '', email: '', password: '', global_role: 'user', is_active: true });
      this.closeCreateUserModal();
      this.currentPage = 1;
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

  // ─── Toggle estado ────────────────────────────────────────────────────────────

  /**
   * Cambia el estado activo/inactivo de un usuario con confirmación si va a desactivar.
   * @param {AdminUser} user Usuario seleccionado.
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

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Retorna el label legible del rol global.
   * @param {string} role Rol del usuario.
   * @returns {string}
   */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = { super_admin: 'Super Admin', user: 'Usuario' };
    return labels[role] ?? role;
  }

  /**
   * Retorna la clase del ícono Bootstrap según el rol.
   * @param {string} role Rol del usuario.
   * @returns {string}
   */
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = { super_admin: 'bi-shield-fill', user: 'bi-person' };
    return icons[role] ?? 'bi-person';
  }

  /**
   * Retorna la inicial del nombre o email del usuario para el avatar.
   * @param {AdminUser} user Usuario.
   * @returns {string}
   */
  getInitial(user: AdminUser): string {
    return (user.full_name || user.email).charAt(0).toUpperCase();
  }
}
