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
import { AuthService } from '../../services/auth.service';
import { SchoolsService } from '../../../features/schools/services/school.service';
import { CourseService } from '../../../features/courses/services/course.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { School } from '../../../features/schools/models/school.interface';
import { Course } from '../../../features/courses/models/course.interface';

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
      firstName:       ['', [Validators.required]],
      lastName:        ['', [Validators.required]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           ['', [Validators.required]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
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
    role:     ['', [Validators.required]],
  });

  /**
   * Paso 3: Confirmación de datos mediante checkbox.
   */
  readonly step3Form: FormGroup = this.fb.group({
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  // ─── Resumen computed ────────────────────────────────────────────────────

  /**
   * Computed que arma el resumen con los valores de paso 1 y 2.
   * Se muestra en el panel de confirmación (paso 3).
   */
  readonly summary = computed(() => {
    const s1 = this.step1Form.value;
    const s2 = this.step2Form.value;

    const school = this.schools().find((s) => s.id === s2.schoolId);
    const course = this.courses().find((c) => c.id === s2.courseId);

    const roleLabels: Record<string, string> = {
      presidente: 'Presidente',
      tesorero:   'Tesorero',
      secretario: 'Secretario',
      apoderado:  'Apoderado',
    };

    return {
      fullName: `${s1.firstName ?? ''} ${s1.lastName ?? ''}`.trim() || '-',
      email:    s1.email  || '-',
      phone:    s1.phone  || '-',
      school:   school?.name || '-',
      course:   course ? `${course.name} (${course.school_year})` : '-',
      role:     roleLabels[s2.role] ?? '-',
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
  get firstName()       { return this.step1Form.get('firstName')!; }
  get lastName()        { return this.step1Form.get('lastName')!; }
  get email()           { return this.step1Form.get('email')!; }
  get phone()           { return this.step1Form.get('phone')!; }
  get password()        { return this.step1Form.get('password')!; }
  get confirmPassword() { return this.step1Form.get('confirmPassword')!; }

  // ─── Getters paso 2 ──────────────────────────────────────────────────────
  get schoolId() { return this.step2Form.get('schoolId')!; }
  get courseId() { return this.step2Form.get('courseId')!; }
  get role()     { return this.step2Form.get('role')!; }

  // ─── Getters paso 3 ──────────────────────────────────────────────────────
  get acceptTerms() { return this.step3Form.get('acceptTerms')!; }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Al iniciar el componente carga la lista de colegios activos.
   */
  async ngOnInit(): Promise<void> {
    if (DEBUG) console.log('🧙 [Register][ngOnInit] Iniciando wizard de registro...');
    await this.loadSchools();
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
   */
  nextStep(): void {
    if (DEBUG) console.log('➡️ [Register][nextStep] Paso actual:', this.currentStep());

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
  toggleConfirm(): void  { this.showConfirm.update((v) => !v); }

  // ─── Envío final ─────────────────────────────────────────────────────────

  /**
   * Envía el registro completo al confirmar en el paso 3.
   * Llama a la Edge Function create-user-admin con todos los datos del wizard.
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

      if (DEBUG) {
        console.log('📦 [Register][submitWizard] Paso 1:', s1);
        console.log('📦 [Register][submitWizard] Paso 2:', s2);
      }

      const { data, error } = await this.supabaseService.client.functions.invoke(
				'create-user-admin',
				{
					body: {
						email:       s1.email,
						password:    s1.password,
						full_name:   `${s1.firstName} ${s1.lastName}`.trim(),
						first_name:  s1.firstName,
						last_name:   s1.lastName,
						phone:       s1.phone,
						global_role: 'user',
						course_id:   s2.courseId,
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