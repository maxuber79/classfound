import { Component, OnInit, inject, signal  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { AdminUsersService } from '../../services/admin-users.service';
import { AdminUser } from '../../models/admin-user.interface';

declare var bootstrap: any;

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [ReactiveFormsModule,DatePipe, NgClass, CommonModule],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss'
})

export class UsersPage implements OnInit {

	//Formulario para creación de usuario (futuro)
	private readonly fb = inject(FormBuilder); 
  readonly loading = signal(false);

  private readonly adminUsersService = inject(AdminUsersService);

  users: AdminUser[] = [];
	createUserForm!: FormGroup;
	isCreatingUser: boolean = false;

	//Estados del usuario al editar
	selectedUser: AdminUser | null = null;
	editUserForm!: FormGroup;
	isEditingUser: boolean = false;

  /**
   * Hook de inicialización del componente.
   * Se ejecuta una vez al cargar la vista y dispara la carga de usuarios.
   */
  async ngOnInit(): Promise<void> {
    console.log('📄 [UsersPage][ngOnInit] Inicializando página de usuarios...');

		this.initCreateUserForm();
		this.initEditUserForm();
    await this.loadUsers();
  }

	 /**
   * Inicializa el formulario reactivo para creación de usuarios.
   *
   * @returns {void}
   */
		initCreateUserForm(): void {
			console.log('🧩 [UsersPage][initCreateUserForm] Inicializando formulario reactivo...');

			this.createUserForm = this.fb.group({
				full_name: ['', [Validators.required, Validators.minLength(3)]],
				email: ['', [Validators.required, Validators.email]],
				password: ['', [Validators.required, Validators.minLength(6)]],
				global_role: ['user', [Validators.required]],
				is_active: [true]
			});

			console.log('✅ [UsersPage][initCreateUserForm] Formulario creado:', this.createUserForm.value);
		}

	/**
	 * Inicializa el formulario reactivo para edición de usuarios.
	 *
	 * @returns {void}
	 */
		initEditUserForm(): void {
			console.log('🧩 [UsersPage][initEditUserForm] Inicializando formulario de edición...');

			this.editUserForm = this.fb.group({
				id: [''],
				full_name: ['', [Validators.required, Validators.minLength(3)]],
				email: [{ value: '', disabled: true }],
				global_role: ['user', [Validators.required]],
				is_active: [true]
			});

			console.log('✅ [UsersPage][initEditUserForm] Formulario de edición creado:', this.editUserForm.getRawValue());
		}
	

  /**
   * Carga la lista de usuarios desde el servicio de administración.
   * @returns {Promise<void>}
   */
		async loadUsers(): Promise<void> {
			console.log('📥 [UsersPage][loadUsers] Cargando usuarios...');

			try {
				this.users = await this.adminUsersService.getUsers();
				console.log('🟢 [UsersPage][loadUsers] Usuarios cargados:', this.users);
			} catch (error) {
				console.error('🔴 [UsersPage][loadUsers] Error al cargar usuarios:', error);
			}
		}

	/**
	 * Abre el modal de edición y carga los datos del usuario seleccionado.
	 *
	 * @param {AdminUser} user Usuario a editar.
	 * @returns {void}
	 */
		openEditUserModal(user: AdminUser): void {
			console.log('✏️ [UsersPage][openEditUserModal] Usuario seleccionado:', user);

			this.selectedUser = user;

			this.editUserForm.patchValue({
				id: user.id,
				full_name: user.full_name,
				email: user.email,
				global_role: user.global_role,
				is_active: user.is_active
			});

			console.log('🧾 [UsersPage][openEditUserModal] Formulario cargado:', this.editUserForm.getRawValue());
		}

	/**
 * Envía la edición del usuario seleccionado.
 *
 * @returns {Promise<void>}
 */
	async onSubmitEditUser(): Promise<void> {
		console.log('🚀 [UsersPage][onSubmitEditUser] Intentando guardar cambios...');

		if (this.editUserForm.invalid) {
			console.warn('⚠️ [UsersPage][onSubmitEditUser] Formulario inválido');
			this.editUserForm.markAllAsTouched();
			return;
		}

		this.isEditingUser = true;

		try {
			const payload = this.editUserForm.getRawValue();

			console.log('📦 [UsersPage][onSubmitEditUser] Payload edición:', payload);

			await this.adminUsersService.updateUserProfile(payload);

			console.log('✅ [UsersPage][onSubmitEditUser] Usuario actualizado correctamente');

			this.closeEditUserModal();
			await this.loadUsers();

		} catch (error) {
			console.error('🔴 [UsersPage][onSubmitEditUser] Error al editar usuario:', error);
		} finally {
			this.isEditingUser = false;
		}
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
			console.log('🚀 [UsersPage][onSubmitCreateUser] Intentando enviar formulario...');

		if (this.createUserForm.invalid) {
			console.warn('⚠️ [UsersPage][onSubmitCreateUser] Formulario inválido');
			this.createUserForm.markAllAsTouched();
			return;
		}

		this.loading.set(true);

		try {
			this.isCreatingUser = true; // 🔥 ACTIVAR SPINNER
			const payload = this.createUserForm.getRawValue();

			console.log('🟢 Payload:', payload);

			const response = await this.adminUsersService.createUser(payload);

			console.log('✅ Usuario creado:', response);

			// 🔄 Reset formulario
			this.createUserForm.reset({
				full_name: '',
				email: '',
				password: '',
				global_role: 'user',
				is_active: true
			});

			// ❌ Cerrar modal
			this.closeCreateUserModal();

			// 🔄 Recargar tabla
			await this.loadUsers();

		} catch (error) {
			console.error('🔴 Error al crear usuario:', error);
		} finally {
			this.loading.set(false);
			this.isCreatingUser = true; // 🔥 ACTIVAR SPINNER
		}
		}

	/**
	 * Cierra el modal de edición de usuario.
	 *
	 * @returns {void}
	 */
	closeEditUserModal(): void {
		const modalElement = document.getElementById('editUserModal');

		if (!modalElement) {
			console.warn('⚠️ [UsersPage][closeEditUserModal] No se encontró el modal');
			return;
		}

		const modalInstance = bootstrap.Modal.getInstance(modalElement);

		if (modalInstance) {
			modalInstance.hide();
			console.log('🪟 [UsersPage][closeEditUserModal] Modal cerrado correctamente');
		}
	}


	/**
	 * Cierra el modal de creación de usuario.
	 */
	closeCreateUserModal(): void {
		const modalEl = document.getElementById('createUserModal');

		if (!modalEl) {
			console.warn('⚠️ Modal no encontrado');
			return;
		}

		const modal = bootstrap.Modal.getInstance(modalEl);

		if (modal) {
			modal.hide();
			console.log('🪟 Modal cerrado');
		}
	}

    /**
   * Retorna el label legible del rol global del usuario.
   *
   * @param {string} role Rol global del usuario.
   * @returns {string} Texto legible del rol.
   */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      user: 'Usuario'
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
      super_admin: 'bi-shield-fill',
      user: 'bi-person'
    };

    return icons[role] ?? 'bi-person';
  }

  /**
   * Retorna la inicial del nombre o email del usuario para el avatar.
   * @param user Usuario del que se extrae la inicial
   */
  getInitial(user: AdminUser): string {
    return (user.full_name || user.email).charAt(0).toUpperCase();
  }

	

	/**
 * Cambia el estado activo/inactivo de un usuario desde la UI.
 *
 * Si el usuario está activo, solicita confirmación antes de deshabilitarlo.
 *
 * @param {AdminUser} user Usuario seleccionado
 * @returns {Promise<void>}
 */
	async toggleStatus(user: AdminUser): Promise<void> {
		console.log('🧠 [UsersPage][toggleStatus] Usuario seleccionado:', user);

		const willDeactivate = user.is_active;

		if (willDeactivate) {
			const confirmed = window.confirm(
				`¿Seguro que deseas desactivar a "${user.full_name || user.email}"?`
			);

			if (!confirmed) {
				console.log('⚠️ [UsersPage][toggleStatus] Acción cancelada por el usuario');
				return;
			}
		}

		try {
			await this.adminUsersService.toggleUserStatus(user.id, user.is_active);

			console.log('🔄 [UsersPage][toggleStatus] Refrescando lista...');
			await this.loadUsers();

		} catch (error) {
			console.error('❌ [UsersPage][toggleStatus] Error al cambiar estado:', error);
		}
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

  console.log('🎭 [UsersPage][onRoleChange] Cambio detectado');
  console.log('👉 Usuario:', user.email);
  console.log('👉 Nuevo rol:', newRole);

  try {
    await this.adminUsersService.updateUserRole(user.id, newRole);

    console.log('🔄 Refrescando lista...');
    await this.loadUsers();

  } catch (error) {
    console.error('❌ Error al cambiar rol:', error);
  }
}
}