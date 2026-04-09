import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminUsersService } from '../../services/admin-users.service';
import { AdminUser } from '../../models/admin-user.interface';
import { SupabaseService } from '../../../../../core/services/supabase.service';

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

  private readonly fb                = inject(FormBuilder);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly supabaseService   = inject(SupabaseService);
  private readonly destroy$          = new Subject<void>();
  private readonly searchSubject     = new Subject<string>();

  // ─── Estado de carga ─────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly saving  = signal(false);

  // ─── Lista de usuarios ────────────────────────────────────────────────────────
  users: AdminUser[] = [];
	

  // ─── Catálogos para selects ───────────────────────────────────────────────────
  schools: any[] = [];
  courses: any[] = [];
  filteredCourses: any[] = [];

  readonly courseRoles = [
    { value: 'presidente', label: 'Presidente' },
    { value: 'tesorero',   label: 'Tesorero'   },
    { value: 'secretario', label: 'Secretario' },
    { value: 'apoderado',  label: 'Apoderado'  },
  ];

	occupiedRoles: string[] = [];

  // ─── Filtros ──────────────────────────────────────────────────────────────────
  searchTerm    = '';
  selectedRole  = '';
  selectedStatus = '';

  // ─── Paginación ───────────────────────────────────────────────────────────────
  currentPage   = 1;
  pageSize      = 5;
  totalUsers    = 0;
  readonly pageSizeOptions = [5, 10, 25, 50];

  // ─── Formularios ──────────────────────────────────────────────────────────────
  createUserForm!: FormGroup;
  isCreatingUser  = false;

  selectedUser: AdminUser | null = null;
  editUserForm!: FormGroup;
  isEditingUser = false;

  // ─── Modo del modal de usuario (ver / editar) ─────────────────────────────────
  isViewMode = true;

  // ─── Computed ─────────────────────────────────────────────────────────────────

  get totalPages():  number   { return Math.ceil(this.totalUsers / this.pageSize); }
  get fromRecord():  number   { return this.totalUsers === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get toRecord():    number   { return Math.min(this.currentPage * this.pageSize, this.totalUsers); }
  get pages():       number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get hasActiveFilters(): boolean { return !!(this.searchTerm || this.selectedRole || this.selectedStatus); }

  
	// ─── Lifecycle ────────────────────────────────────────────────────────────────

  /**
   * Hook de inicialización. Configura formularios, debounce y carga inicial.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('📄 [UsersPage][ngOnInit] Inicializando...');
    this.initCreateUserForm();
    this.initEditUserForm();
    this.setupSearchDebounce();
    await Promise.all([this.loadUsers(), this.loadSchools()]);
  }

  /**
   * Hook de destrucción. Limpia subscripciones.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Setup ────────────────────────────────────────────────────────────────────

  /**
   * Configura el debounce del campo de búsqueda.
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm = term;
      this.currentPage = 1;
      this.loadUsers();
    });
  }

  /**
   * Inicializa el formulario de creación con campos de curso.
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
      school_id:   [''],
      course_id:   [''],
      course_role: [''],
    });
  }

  /**
   * Inicializa el formulario de edición con campos de curso.
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
      school_id:   [''],
      course_id:   [''],
      course_role: [''],
    });
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────────

  /**
   * Carga la lista paginada de usuarios con filtros activos.
   */
  async loadUsers(): Promise<void> {
    if (DEBUG) console.log('📥 [UsersPage][loadUsers] page:', this.currentPage);
    this.loading.set(true);
    try {
      const result = await this.adminUsersService.getUsers({
        search:   this.searchTerm,
        role:     this.selectedRole,
        status:   this.selectedStatus,
        page:     this.currentPage,
        pageSize: this.pageSize,
      });
      this.users      = result.users;
      this.totalUsers = result.total;
      if (DEBUG) console.log('🟢 [UsersPage][loadUsers] Total:', this.totalUsers);
    } catch (error) {
      console.error('🔴 [UsersPage][loadUsers] Error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Carga el listado de colegios activos para los selects.
   */
  async loadSchools(): Promise<void> {
    if (DEBUG) console.log('🏫 [UsersPage][loadSchools] Cargando colegios...');
    const { data, error } = await this.supabaseService.client
      .from('schools')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('🔴 [UsersPage][loadSchools] Error:', error);
      return;
    }
    this.schools = data ?? [];
    if (DEBUG) console.log('✅ [UsersPage][loadSchools] Total:', this.schools.length);
  }

  /**
   * Carga cursos activos filtrados por colegio seleccionado.
   * @param {string} schoolId ID del colegio seleccionado.
   * @param {string} targetForm Formulario destino: 'create' o 'edit'.
   */
  async onSchoolChange(schoolId: string, targetForm: 'create' | 'edit'): Promise<void> {
    if (DEBUG) console.log('🏫 [UsersPage][onSchoolChange] schoolId:', schoolId, '| form:', targetForm);

		// al inicio de onSchoolChange
		this.occupiedRoles = [];
    const form = targetForm === 'create' ? this.createUserForm : this.editUserForm;
    form.patchValue({ course_id: '', course_role: '' });
    this.filteredCourses = [];

    if (!schoolId) return;

    const { data, error } = await this.supabaseService.client
      .from('courses')
      .select('id, name, level, section')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('🔴 [UsersPage][onSchoolChange] Error:', error);
      return;
    }

    this.filteredCourses = data ?? [];
    if (DEBUG) console.log('✅ [UsersPage][onSchoolChange] Cursos:', this.filteredCourses.length);
  }

  // ─── Handlers de filtros ──────────────────────────────────────────────────────

  onSearchInput(term: string):    void { this.searchSubject.next(term); }
  onRoleFilterChange():           void { this.currentPage = 1; this.loadUsers(); }
  onStatusFilterChange():         void { this.currentPage = 1; this.loadUsers(); }
  onPageSizeChange():             void { this.currentPage = 1; this.loadUsers(); }
  clearFilters():                 void { this.searchTerm = ''; this.selectedRole = ''; this.selectedStatus = ''; this.currentPage = 1; this.loadUsers(); }
  goToPage(page: number):         void { if (page >= 1 && page <= this.totalPages) { this.currentPage = page; this.loadUsers(); } }

  // ─── Modal usuario (ver / editar) ─────────────────────────────────────────────

  /**
   * Carga los datos del usuario en el formulario de edición.
   * @param {AdminUser} user Usuario a cargar.
   */
  private async loadUserIntoForm(user: AdminUser): Promise<void> {
    this.selectedUser = user;

    // Cargar cursos del colegio si tiene asignación
    if (user.school_id) {
      await this.onSchoolChange(user.school_id, 'edit');
    }

    this.editUserForm.patchValue({
      id:          user.id,
      first_name:  user.first_name  || '',
      last_name:   user.last_name   || '',
      phone:       user.phone       || '',
      email:       user.email,
      global_role: user.global_role,
      is_active:   user.is_active,
      school_id:   user.school_id   || '',
      course_id:   user.course_id   || '',
      course_role: user.course_role || '',
    });

    if (DEBUG) console.log('🧾 [UsersPage][loadUserIntoForm] Formulario:', this.editUserForm.getRawValue());
  }

  /**
   * Abre el modal en modo visualización.
   * @param {AdminUser} user Usuario a visualizar.
   */
  async openViewUserModal(user: AdminUser): Promise<void> {
    if (DEBUG) console.log('👁️ [UsersPage][openViewUserModal] usuario:', user.email);
    this.isViewMode = true;
    await this.loadUserIntoForm(user);
    this.editUserForm.disable();
    this.openUserModal();
  }

  /**
   * Abre el modal en modo edición.
   * @param {AdminUser} user Usuario a editar.
   */
  async openEditUserModal(user: AdminUser): Promise<void> {
    if (DEBUG) console.log('✏️ [UsersPage][openEditUserModal] usuario:', user.email);
    this.isViewMode = false;
    await this.loadUserIntoForm(user);
    this.editUserForm.enable();
    this.editUserForm.get('email')?.disable();
    this.openUserModal();
  }

  /**
   * Cambia desde modo visualización a modo edición.
   */
  enableEditMode(): void {
    if (DEBUG) console.log('🛠️ [UsersPage][enableEditMode] Activando edición');
    this.isViewMode = false;
    this.editUserForm.enable();
    this.editUserForm.get('email')?.disable();
  }

  /**
   * Instancia y muestra el modal de usuario.
   */
  private openUserModal(): void {
    const modalEl = document.getElementById('userModal');
    if (!modalEl) return;
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  }

  /**
   * Cierra el modal de usuario.
   */
  closeUserModal(): void {
    const modalEl = document.getElementById('userModal');
    if (!modalEl) return;
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    this.isViewMode = true;
    this.filteredCourses = [];
    if (DEBUG) console.log('🪟 [UsersPage][closeUserModal] Modal cerrado');
  }

  /**
   * Guarda los cambios del usuario editado incluyendo asignación de curso.
   */
  async onSubmitEditUser(): Promise<void> {
    if (DEBUG) console.log('🚀 [UsersPage][onSubmitEditUser] Guardando...');
    if (this.editUserForm.invalid) {
      this.editUserForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    try {
      const raw = this.editUserForm.getRawValue();
      const payload = {
        ...raw,
        full_name: `${raw.first_name} ${raw.last_name}`.trim()
      };

      // Actualizar perfil
      await this.adminUsersService.updateUserProfile(payload);

      // Actualizar asignación de curso si tiene course_id y course_role
      if (raw.course_id && raw.course_role) {
        await this.adminUsersService.upsertCourseMember(raw.id, raw.course_id, raw.course_role);
        if (DEBUG) console.log('✅ [UsersPage][onSubmitEditUser] Membresía actualizada');
      }

      if (DEBUG) console.log('✅ [UsersPage][onSubmitEditUser] Usuario actualizado');
      this.closeUserModal();
      await this.loadUsers();
    } catch (error) {
      console.error('🔴 [UsersPage][onSubmitEditUser] Error:', error);
    } finally {
      this.saving.set(false);
    }
  }

  // ─── Modal crear usuario ──────────────────────────────────────────────────────

  /**
   * Envía el formulario de creación de usuario al servicio.
   */
  async onSubmitCreateUser(): Promise<void> {
    if (DEBUG) console.log('🚀 [UsersPage][onSubmitCreateUser] Enviando...');
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.isCreatingUser = true;
    try {
      const raw = this.createUserForm.getRawValue();
      const payload = {
        ...raw,
        full_name: `${raw.first_name} ${raw.last_name}`.trim()
      };
      if (DEBUG) console.log('📦 [UsersPage][onSubmitCreateUser] Payload:', payload);
      await this.adminUsersService.createUser(payload);
      if (DEBUG) console.log('✅ [UsersPage][onSubmitCreateUser] Usuario creado');
      this.createUserForm.reset({
        first_name: '', last_name: '', phone: '', email: '',
        password: '', global_role: 'user', is_active: true,
        school_id: '', course_id: '', course_role: ''
      });
      this.filteredCourses = [];
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
    this.filteredCourses = [];
  }

  // ─── Toggle estado ────────────────────────────────────────────────────────────

  /**
   * Cambia el estado activo/inactivo de un usuario.
   * @param {AdminUser} user Usuario seleccionado.
   */
  async toggleStatus(user: AdminUser): Promise<void> {
    if (DEBUG) console.log('🧠 [UsersPage][toggleStatus] usuario:', user.email);
    if (user.is_active) {
      const confirmed = window.confirm(`¿Seguro que deseas desactivar a "${user.full_name || user.email}"?`);
      if (!confirmed) return;
    }
    try {
      await this.adminUsersService.toggleUserStatus(user.id, user.is_active);
      await this.loadUsers();
    } catch (error) {
      console.error('❌ [UsersPage][toggleStatus] Error:', error);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** @param {string} role Rol global del usuario */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = { super_admin: 'Super Admin', user: 'Usuario' };
    return labels[role] ?? role;
  }

  /** @param {string} role Rol global del usuario */
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = { super_admin: 'bi-shield-fill', user: 'bi-person' };
    return icons[role] ?? 'bi-person';
  }

  /** @param {string} role Rol de curso */
  getCourseRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      presidente: 'Presidente',
      tesorero:   'Tesorero',
      secretario: 'Secretario',
      apoderado:  'Apoderado',
    };
    return labels[role] ?? role;
  }

  /** @param {AdminUser} user Usuario */
  getInitial(user: AdminUser): string {
    return (user.full_name || user.email).charAt(0).toUpperCase();
  }

	/**
	 * Carga los roles ocupados del curso seleccionado.
	 * @param {string} courseId ID del curso.
	 * @param {string | null} excludeUserId ID del usuario a excluir en edición.
	 */
	async onCourseChange(courseId: string, excludeUserId: string | null = null): Promise<void> {
		if (DEBUG) console.log('[UsersPage][onCourseChange] courseId:', courseId);
		this.occupiedRoles = [];
		if (!courseId) return;
		this.occupiedRoles = await this.adminUsersService.getOccupiedRoles(courseId, excludeUserId);
		if (DEBUG) console.log('[UsersPage][onCourseChange] Roles ocupados:', this.occupiedRoles);
	}

	/**
	 * Indica si un rol está ocupado en el curso seleccionado.
	 * @param {string} role Rol a verificar.
	 * @returns {boolean}
	 */
	isRoleOccupied(role: string): boolean {
		return this.occupiedRoles.includes(role);
	}
}