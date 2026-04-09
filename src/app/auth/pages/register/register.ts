import {
	Component,
	inject,
	signal,
	computed,
	OnInit,
} from '@angular/core';
import {
	ReactiveFormsModule,
	FormBuilder,
	FormGroup,
	Validators,
	AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SchoolsService } from '../../../features/schools/services/school.service';
import { CourseService } from '../../../features/courses/services/course.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { School } from '../../../features/schools/models/school.interface';
import { Course } from '../../../features/courses/models/course.interface';
import { LocationService, ComunaChile } from '../../../core/services/location.service';
const DEBUG = true;

/**
 * Validador personalizado: verifica que password y confirmPassword coincidan.
 *
 * @param {AbstractControl} control FormGroup que contiene ambos campos.
 * @returns {null | { passwordMismatch: true }}
 */
function passwordMatchValidator(control: AbstractControl) {
	const password = control.get('password')?.value;
	const confirm = control.get('confirmPassword')?.value;
	return password === confirm ? null : { passwordMismatch: true };
}

@Component({
	selector: 'app-register',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink],
	templateUrl: './register.html',
	styleUrl: './register.scss',
})
export class Register implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly authService = inject(AuthService);
	private readonly router = inject(Router);
	private readonly schoolsService = inject(SchoolsService);
	private readonly courseService = inject(CourseService);
	private readonly supabaseService = inject(SupabaseService);
	private readonly locationService = inject(LocationService);

	// ─── Estado del wizard ───────────────────────────────────────────────────

	/** Paso actual del wizard (1 a 4). */
	readonly currentStep = signal(1);

	/** Total de pasos del wizard. */
	readonly totalSteps = 4;

	// ─── Estado de carga ─────────────────────────────────────────────────────

	/** Indica si se está enviando el formulario final. */
	readonly loading = signal(false);

	/** Indica si se están cargando los colegios desde Supabase. */
	readonly loadingSchools = signal(false);

	/** Indica si se están cargando los cursos desde Supabase. */
	readonly loadingCourses = signal(false);

	/** Lista de comunas de Chile para el select del formulario de nuevo colegio. */
	readonly comunas = signal<ComunaChile[]>([]);

	// ─── Datos desde Supabase ────────────────────────────────────────────────

	/** Lista de colegios activos para el select del paso 2. */
	readonly schools = signal<School[]>([]);

	/** Lista de cursos activos del colegio seleccionado para el select del paso 2. */
	readonly courses = signal<Course[]>([]);

	// ─── Mensajes ────────────────────────────────────────────────────────────

	/** Mensaje de error general mostrado en el paso 3. */
	readonly errorMessage = signal<string | null>(null);

	// ─── Visibilidad de contraseñas ──────────────────────────────────────────

	readonly showPassword = signal(false);
	readonly showConfirm = signal(false);

	// ─── Formularios por paso ────────────────────────────────────────────────

	/**
	 * Paso 1: Datos personales del usuario.
	 */
	readonly step1Form: FormGroup = this.fb.group(
		{
			firstName: ['', [Validators.required]],
			lastName: ['', [Validators.required]],
			email: ['', [Validators.required, Validators.email]],
			phone: ['', [Validators.required]],
			password: ['', [Validators.required, Validators.minLength(6)]],
			confirmPassword: ['', [Validators.required]],
		},
		{ validators: passwordMatchValidator }
	);

	/**
	 * Paso 2: Selección de colegio, curso y rol (selects encadenados).
	 */
	readonly step2Form: FormGroup = this.fb.group({
		schoolId: ['', [Validators.required]],
		courseId: ['', [Validators.required]],
		role: ['', [Validators.required]],
	});


	/**
	 * Paso 3: Confirmación de datos mediante checkbox.
	 */
	readonly step3Form: FormGroup = this.fb.group({
		acceptTerms: [false, [Validators.requiredTrue]],
	});

	// ─── Modo crear colegio / curso ──────────────────────────────────────────

	/** Indica si el usuario quiere crear un colegio nuevo en lugar de seleccionar uno. */
	readonly createNewSchool = signal(false);

	/** Indica si el usuario quiere crear un curso nuevo en lugar de seleccionar uno. */
	readonly createNewCourse = signal(false);

	/**
	 * Formulario para crear un colegio nuevo en el paso 2.
	 */
	readonly newSchoolForm: FormGroup = this.fb.group({
		name: ['', [Validators.required]],
		commune: ['', [Validators.required]],
	});

	/**
	 * Formulario para crear un curso nuevo en el paso 2.
	 */
	readonly newCourseForm: FormGroup = this.fb.group({
		name: ['', [Validators.required]],
		level: ['', [Validators.required]],
		section: ['', [Validators.required]],
		school_year: [new Date().getFullYear(), [Validators.required]],
	});

	// ─── Resumen computed ────────────────────────────────────────────────────

	/**
	 * Computed que arma el resumen con los valores de paso 1 y 2.
	 * Considera si el usuario seleccionó o creó colegio/curso.
	 */
	readonly summary = computed(() => {
		const s1 = this.step1Form.value;
		const s2 = this.step2Form.value;

		// Colegio
		let schoolName = '-';
		if (this.createNewSchool()) {
			schoolName = this.newSchoolForm.value.name || '-';
		} else {
			const school = this.schools().find((s) => s.id === s2.schoolId);
			schoolName = school?.name || '-';
		}

		// Curso
		let courseName = '-';
		if (this.createNewCourse()) {
			const nc = this.newCourseForm.value;
			courseName = nc.name ? `${nc.name} ${nc.section} (${nc.school_year})` : '-';
		} else {
			const course = this.courses().find((c) => c.id === s2.courseId);
			courseName = course ? `${course.name} (${course.school_year})` : '-';
		}

		const roleLabels: Record<string, string> = {
			presidente: 'Presidente',
			tesorero: 'Tesorero',
			secretario: 'Secretario',
			apoderado: 'Apoderado',
		};

		return {
			fullName: `${s1.firstName ?? ''} ${s1.lastName ?? ''}`.trim() || '-',
			email: s1.email || '-',
			phone: s1.phone || '-',
			school: schoolName,
			course: courseName,
			role: roleLabels[s2.role] ?? '-',
		};
	});

	// ─── Progreso ────────────────────────────────────────────────────────────

	/**
	 * Computed que calcula el porcentaje de la barra de progreso.
	 */
	readonly progressPercent = computed(
		() => (this.currentStep() / this.totalSteps) * 100
	);

	// ─── Getters paso 1 ──────────────────────────────────────────────────────
	get firstName() { return this.step1Form.get('firstName')!; }
	get lastName() { return this.step1Form.get('lastName')!; }
	get email() { return this.step1Form.get('email')!; }
	get phone() { return this.step1Form.get('phone')!; }
	get password() { return this.step1Form.get('password')!; }
	get confirmPassword() { return this.step1Form.get('confirmPassword')!; }

	// ─── Getters paso 2 ──────────────────────────────────────────────────────
	get schoolId() { return this.step2Form.get('schoolId')!; }
	get courseId() { return this.step2Form.get('courseId')!; }
	get role() { return this.step2Form.get('role')!; }

	// ─── Getters paso 3 ──────────────────────────────────────────────────────
	get acceptTerms() { return this.step3Form.get('acceptTerms')!; }

	// ─── Getters nuevos campos colegio ───────────────────────────────────────
	get newSchoolName() { return this.newSchoolForm.get('name')!; }
	get newSchoolCommune() { return this.newSchoolForm.get('commune')!; }

	// ─── Getters nuevos campos curso ─────────────────────────────────────────
	get newCourseName() { return this.newCourseForm.get('name')!; }
	get newCourseLevel() { return this.newCourseForm.get('level')!; }
	get newCourseSection() { return this.newCourseForm.get('section')!; }
	get newCourseSchoolYear() { return this.newCourseForm.get('school_year')!; }

	// ─── Lifecycle ───────────────────────────────────────────────────────────

	/**
	 * Al iniciar el componente carga la lista de colegios activos.
	 */
	async ngOnInit(): Promise<void> {
		if (DEBUG) console.log('🧙 [Register][ngOnInit] Iniciando wizard de registro...');
		await this.loadSchools();
		await this.loadComunas();
	}

	// ─── Carga de datos ──────────────────────────────────────────────────────

	/**
	 * Carga los colegios activos desde Supabase.
	 */
	async loadSchools(): Promise<void> {
		if (DEBUG) console.log('🏫 [Register][loadSchools] Cargando colegios activos...');

		this.loadingSchools.set(true);

		try {
			const data = await this.schoolsService.getActiveSchools();
			this.schools.set(data);
			if (DEBUG) console.log('✅ [Register][loadSchools] Colegios cargados:', data.length);
		} catch (error) {
			console.error('🔴 [Register][loadSchools] Error:', error);
		} finally {
			this.loadingSchools.set(false);
		}
	}

	/**
	 * Carga el listado de comunas de Chile desde el JSON local.
	 */
	async loadComunas(): Promise<void> {
		if (DEBUG) console.log('📍 [Register][loadComunas] Cargando comunas...');
		try {
			const data = await firstValueFrom(this.locationService.getComunas());
			this.comunas.set(data);
			if (DEBUG) console.log('✅ [Register][loadComunas] Comunas cargadas:', data.length);
		} catch (error) {
			console.error('🔴 [Register][loadComunas] Error:', error);
		}
	}

	/**
	 * Se dispara al cambiar el select de colegio.
	 * Resetea el select de curso y carga los cursos activos del colegio elegido.
	 *
	 * @param {Event} event Evento change del select de colegio.
	 */
	async onSchoolChange(event: Event): Promise<void> {
		const schoolId = (event.target as HTMLSelectElement).value;

		if (DEBUG) console.log('🔄 [Register][onSchoolChange] schoolId:', schoolId);

		this.step2Form.patchValue({ courseId: '' });
		this.courses.set([]);

		if (!schoolId) return;

		this.loadingCourses.set(true);

		try {
			const data = await this.courseService.getActiveCoursesBySchool(schoolId);
			this.courses.set(data);
			if (DEBUG) console.log('✅ [Register][onSchoolChange] Cursos cargados:', data.length);
		} catch (error) {
			console.error('🔴 [Register][onSchoolChange] Error:', error);
		} finally {
			this.loadingCourses.set(false);
		}
	}

	// ─── Navegación ──────────────────────────────────────────────────────────


	/**
	 * Avanza al siguiente paso si el formulario del paso actual es válido.
	 * En el paso 2 valida según el modo activo (seleccionar o crear).
	 */
	nextStep(): void {
		if (DEBUG) console.log('➡️ [Register][nextStep] Paso actual:', this.currentStep());

		if (this.currentStep() === 2) {
			// Validar colegio
			if (this.createNewSchool()) {
				if (this.newSchoolForm.invalid) {
					this.newSchoolForm.markAllAsTouched();
					if (DEBUG) console.log('⚠️ [Register][nextStep] newSchoolForm inválido.');
					return;
				}
			} else {
				if (this.schoolId.invalid) {
					this.step2Form.markAllAsTouched();
					if (DEBUG) console.log('⚠️ [Register][nextStep] schoolId inválido.');
					return;
				}
			}

			// Validar curso
			if (this.createNewCourse()) {
				if (this.newCourseForm.invalid) {
					this.newCourseForm.markAllAsTouched();
					if (DEBUG) console.log('⚠️ [Register][nextStep] newCourseForm inválido.');
					return;
				}
			} else {
				if (this.courseId.invalid) {
					this.step2Form.markAllAsTouched();
					if (DEBUG) console.log('⚠️ [Register][nextStep] courseId inválido.');
					return;
				}
			}

			// Validar rol
			if (this.role.invalid) {
				this.step2Form.markAllAsTouched();
				if (DEBUG) console.log('⚠️ [Register][nextStep] role inválido.');
				return;
			}

			this.currentStep.update((s) => s + 1);
			if (DEBUG) console.log('✅ [Register][nextStep] Nuevo paso:', this.currentStep());
			return;
		}

		const form = this.getFormForStep(this.currentStep());
		if (form.invalid) {
			form.markAllAsTouched();
			if (DEBUG) console.log('⚠️ [Register][nextStep] Formulario inválido.');
			return;
		}

		this.currentStep.update((s) => s + 1);
		if (DEBUG) console.log('✅ [Register][nextStep] Nuevo paso:', this.currentStep());
	}

	/**
	 * Retrocede al paso anterior.
	 */
	prevStep(): void {
		if (DEBUG) console.log('⬅️ [Register][prevStep] Paso actual:', this.currentStep());

		if (this.currentStep() > 1) {
			this.currentStep.update((s) => s - 1);
		}
	}

	/**
	 * Devuelve el FormGroup correspondiente al paso indicado.
	 *
	 * @param {number} step Número del paso.
	 * @returns {FormGroup}
	 */
	private getFormForStep(step: number): FormGroup {
		if (step === 1) return this.step1Form;
		if (step === 2) return this.step2Form;
		return this.step3Form;
	}

	// ─── Visibilidad contraseñas ─────────────────────────────────────────────

	/** Alterna visibilidad del campo contraseña. */
	togglePassword(): void { this.showPassword.update((v) => !v); }

	/** Alterna visibilidad del campo confirmar contraseña. */
	toggleConfirm(): void { this.showConfirm.update((v) => !v); }

	// ─── Toggle crear colegio / curso ─────────────────────────────────────────

	/**
	 * Alterna entre seleccionar colegio existente y crear uno nuevo.
	 * Resetea los formularios y signals relacionados al cambiar de modo.
	 */
	toggleCreateNewSchool(): void {
		if (DEBUG) console.log('🏫 [Register][toggleCreateNewSchool] Modo crear:', !this.createNewSchool());

		this.createNewSchool.update((v) => !v);
		this.createNewCourse.set(false);

		// Resetear selecciones
		this.step2Form.patchValue({ schoolId: '', courseId: '' });
		this.newSchoolForm.reset({ name: '', commune: '' });
		this.newCourseForm.reset({ name: '', level: '', section: '', school_year: new Date().getFullYear() });
		this.courses.set([]);
	}

	/**
	 * Alterna entre seleccionar curso existente y crear uno nuevo.
	 * Solo disponible cuando hay un colegio seleccionado o se está creando uno nuevo.
	 */
	toggleCreateNewCourse(): void {
		if (DEBUG) console.log('📚 [Register][toggleCreateNewCourse] Modo crear:', !this.createNewCourse());

		this.createNewCourse.update((v) => !v);
		this.step2Form.patchValue({ courseId: '' });
		this.newCourseForm.reset({ name: '', level: '', section: '', school_year: new Date().getFullYear() });
	}

	// ─── Envío final ─────────────────────────────────────────────────────────

	/**
	* Envía el registro completo al confirmar en el paso 3.
	* Si hay colegio o curso nuevo, los crea primero en Supabase.
	* Luego llama a la Edge Function create-user-admin.
	*/
	async submitWizard(): Promise<void> {
		if (DEBUG) console.log('🚀 [Register][submitWizard] Iniciando envío...');

		if (this.step3Form.invalid) {
			this.step3Form.markAllAsTouched();
			return;
		}

		this.loading.set(true);
		this.errorMessage.set(null);

		try {
			const s1 = this.step1Form.value;
			const s2 = this.step2Form.value;

			let schoolId = s2.schoolId;
			let courseId = s2.courseId;

			// ─── Crear colegio si es nuevo ──────────────────────────────────────
			if (this.createNewSchool()) {
				if (DEBUG) console.log('🏫 [Register][submitWizard] Creando colegio nuevo...');

				const { data, error } = await this.supabaseService.client
					.from('schools')
					.insert({
						name: this.newSchoolForm.value.name.trim(),
						commune: this.newSchoolForm.value.commune.trim(),
						region: 'RM',
						is_active: true,
					})
					.select()
					.single();

				if (error) throw error;

				schoolId = data.id;
				if (DEBUG) console.log('✅ [Register][submitWizard] Colegio creado:', schoolId);
			}

			// ─── Crear curso si es nuevo ────────────────────────────────────────
			if (this.createNewCourse()) {
				if (DEBUG) console.log('📚 [Register][submitWizard] Creando curso nuevo...');

				const { data, error } = await this.supabaseService.client
					.from('courses')
					.insert({
						school_id: schoolId,
						name: this.newCourseForm.value.name.trim(),
						level: this.newCourseForm.value.level.trim(),
						section: this.newCourseForm.value.section.trim(),
						school_year: Number(this.newCourseForm.value.school_year),
						is_active: true,
					})
					.select()
					.single();

				if (error) throw error;

				courseId = data.id;
				if (DEBUG) console.log('✅ [Register][submitWizard] Curso creado:', courseId);
			}

			if (DEBUG) {
				console.log('📦 [Register][submitWizard] Paso 1:', s1);
				console.log('📦 [Register][submitWizard] schoolId final:', schoolId);
				console.log('📦 [Register][submitWizard] courseId final:', courseId);
			}

			// ─── Crear usuario ──────────────────────────────────────────────────
			const { data, error } = await this.supabaseService.client.functions.invoke(
				'create-user-admin',
				{
					body: {
						email: s1.email,
						password: s1.password,
						full_name: `${s1.firstName} ${s1.lastName}`.trim(),
						first_name: s1.firstName,
						last_name: s1.lastName,
						phone: s1.phone,
						global_role: 'user',
						course_id: courseId,
						course_role: s2.role,
					},
					headers: {
						Authorization: `Bearer ${this.supabaseService.anonKey}`,
					},
				}
			);

			if (error) throw error;

			if (DEBUG) console.log('✅ [Register][submitWizard] Respuesta:', data);

			// Login automático tras registro exitoso
			await this.authService.signIn(s1.email, s1.password);
			if (DEBUG) console.log('✅ [Register][submitWizard] Login automático realizado.');

			this.currentStep.set(4);

		} catch (error: any) {
			console.error('🔴 [Register][submitWizard] Error:', error);
			this.errorMessage.set(error.message ?? 'Error al crear la cuenta. Intenta nuevamente.');
		} finally {
			this.loading.set(false);
		}
	}

	// ─── Navegación post-registro ────────────────────────────────────────────

	/** Redirige al login tras el registro exitoso. */
	goToLogin(): void {
		if (DEBUG) console.log('🔑 [Register][goToLogin] Redirigiendo...');
		this.router.navigate(['/login']);
	}

	/** Redirige al dashboard tras el registro exitoso. */
	goToDashboard(): void {
		if (DEBUG) console.log('🏠 [Register][goToDashboard] Redirigiendo...');
		this.router.navigate(['/dashboard']);
	}
}