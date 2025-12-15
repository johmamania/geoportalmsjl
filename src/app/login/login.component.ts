import { Component, signal } from '@angular/core';
import { MaterialModule } from '../material/material.module';
import { NgIf, NgFor } from '@angular/common';
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginRequest } from '../model/admin-auth';

interface Categoria {
  titulo: string;
  icono: string;
  descripcion: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MaterialModule, NgIf, NgFor, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  error: string = '';
  message: string = '';
  _formulario: FormGroup;
  _formularioRegistro: FormGroup;
  username: string = '';
  password: string = '';
  accessCode: string = '';
  loading = signal(false);
  showCodeInput = signal(false);
  accessCodeValue = signal<string | null>(null);
  showPassword = false;
  showRegistro = signal(false); // Controla qué formulario mostrar (false = Iniciar Sesión por defecto)

  // Lista de categorías de cursos
  categorias: Categoria[] = [
    {
      titulo: 'Capacitación',
      icono: 'school',
      descripcion: 'Desarrolla tus habilidades profesionales con nuestros cursos de capacitación. Aprende nuevas competencias que te ayudarán a destacar en el mercado laboral y alcanzar tus metas profesionales.'
    },
    {
      titulo: 'Tecnología',
      icono: 'computer',
      descripcion: 'Mantente actualizado con las últimas tendencias tecnológicas. Nuestros cursos cubren desde programación básica hasta tecnologías avanzadas, preparándote para el futuro digital.'
    },
    {
      titulo: 'Seguridad',
      icono: 'security',
      descripcion: 'Aprende sobre seguridad informática, protección de datos y mejores prácticas para mantener tu información y la de tu organización segura en el mundo digital actual.'
    },
    {
      titulo: 'Emprendimiento',
      icono: 'business_center',
      descripcion: 'Conviértete en un emprendedor exitoso. Aprende a crear, gestionar y hacer crecer tu negocio con estrategias probadas y herramientas prácticas para el éxito empresarial.'
    },
    {
      titulo: 'Marketing',
      icono: 'campaign',
      descripcion: 'Domina las técnicas de marketing digital y tradicional. Aprende a promocionar productos y servicios efectivamente, aumentar ventas y construir una marca sólida en el mercado.'
    },
    {
      titulo: 'Finanzas',
      icono: 'account_balance',
      descripcion: 'Gestiona tus finanzas personales y empresariales con confianza. Aprende sobre inversiones, presupuestos, contabilidad y planificación financiera para alcanzar la estabilidad económica.'
    }
  ];

  constructor(
    private adminAuthService: AdminAuthService,
    private router: Router,
  ) {
    // Formulario de login
    this._formulario = new FormGroup({
      username: new FormControl("", Validators.required),
      password: new FormControl("", Validators.required),
      accessCode: new FormControl("")
    });

    // Formulario de registro
    this._formularioRegistro = new FormGroup({
      nombres: new FormControl("", [Validators.required, Validators.minLength(2)]),
      apellidos: new FormControl("", [Validators.required, Validators.minLength(2)]),
      correo: new FormControl("", [Validators.required, Validators.email]),
      direccion: new FormControl("", Validators.required),
      edad: new FormControl("", [Validators.required, Validators.min(18), Validators.max(100)]),
      dni: new FormControl("", [Validators.required, Validators.pattern(/^\d{8}$/)]),
      password: new FormControl("", [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl("", Validators.required)
    }, { validators: this.passwordMatchValidator });
  }

  // Validador personalizado para verificar que las contraseñas coincidan
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password');
    const confirmPassword = formGroup.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword && confirmPassword.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }
      return null;
    }
  }

  toggleForm(): void {
    this.showRegistro.set(!this.showRegistro());
    this.error = '';
    this.message = '';
    if (!this.showRegistro()) {
      this._formularioRegistro.reset();
    } else {
      this.resetForm();
    }
  }

  login() {
    if (this._formulario.invalid) {
      return;
    }

    if (!this.showCodeInput()) {
      // Primera fase: autenticar usuario y contraseña
      this.authenticateUser();
    } else {
      // Segunda fase: verificar código de acceso
      this.verifyAccessCode();
    }
  }

  private authenticateUser(): void {
    this.loading.set(true);
    this.error = '';
    this.message = '';

    // Validar que el servicio esté disponible
    if (!this.adminAuthService) {
      console.error('AdminAuthService no está disponible');
      this.loading.set(false);
      this.error = 'Error de configuración del servicio';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error de configuración del servicio de autenticación',
        confirmButtonColor: '#d32f2f'
      });
      return;
    }

    // Validar que el método login exista
    if (typeof this.adminAuthService.login !== 'function') {
      console.error('El método login no está disponible en AdminAuthService');
      this.loading.set(false);
      this.error = 'Error de configuración del servicio';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'El método de autenticación no está disponible',
        confirmButtonColor: '#d32f2f'
      });
      return;
    }

    const swalWithCustomTitle = Swal.mixin({
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button',
        cancelButton: 'custom-swal-cancel-button'
      },
      didOpen: () => {
        Swal.showLoading();
        Swal.getPopup().style.background = 'linear-gradient(120deg,rgba(39, 12, 192, 1),rgba(6, 5, 68, 1))';
        Swal.getPopup().style.color = '#fff';
        Swal.getPopup().style.borderRadius = '15px';
        Swal.getPopup().style.boxShadow = '0 20px 30px rgba(0,0,0,0.4)';
        const titleElement = document.querySelector('.custom-swal-title');
        if (titleElement) {
          titleElement.textContent = 'Verificando credenciales...';
        }
      }
    });

    swalWithCustomTitle.fire({
      html: '<div style="font-family: Arial, sans-serif; font-size: 22px; color: #fff;">Verificando credenciales...</div>',
      timerProgressBar: true,
      allowOutsideClick: false
    });

    const credentials: AdminLoginRequest = {
      username: this._formulario.get('username')?.value,
      password: this._formulario.get('password')?.value
    };

    // Validar credenciales antes de enviar
    if (!credentials.username || !credentials.password) {
      Swal.close();
      this.loading.set(false);
      this.error = 'Por favor, complete todos los campos';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: this.error,
        confirmButtonColor: '#d32f2f'
      });
      return;
    }

    try {
      this.adminAuthService.login(credentials).subscribe({
      next: (response) => {
        Swal.close();
        this.loading.set(false);

        if (response.success && response.access_code) {
          this.accessCodeValue.set(response.access_code);
          this.showCodeInput.set(true);
          this.message = `Código de acceso generado: ${response.access_code}`;

          // Obtener los últimos 4 caracteres del código
          const codeLength = response.access_code.length;
          const last4Digits = response.access_code.substring(codeLength - 4);
          const maskedCode = '*'.repeat(codeLength - 4) + last4Digits;

          // Setear automáticamente el código completo en el campo (oculto para el usuario)
          this._formulario.patchValue({
            accessCode: response.access_code
          });
          this.accessCode = response.access_code;

          // Mostrar código en SweetAlert
          Swal.fire({
            title: 'Código de Acceso Generado',
            html: `
              <div style="text-align: center; padding: 20px;">
                <h2 style="font-family: 'Courier New', monospace; font-size: 32px; color: #1e3c72; letter-spacing: 2px; margin: 20px 0;">
                  ${maskedCode}
                </h2>
                <p style="color: #666; margin-top: 20px;">Código configurado automáticamente. Verifique los últimos 4 dígitos.</p>
              </div>
            `,
            icon: 'info',
            confirmButtonText: 'Continuar',
            confirmButtonColor: '#1e3c72'
          });
        } else {
          this.error = response.message || 'Error en la autenticación';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.error,
            confirmButtonColor: '#d32f2f'
          });
        }
      },
      error: (error) => {
        Swal.close();
        this.loading.set(false);
        const errorMessage = error?.message || error?.error?.message || 'Error al conectar con el servidor';
        this.error = errorMessage;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.error,
          confirmButtonColor: '#d32f2f'
        });
      }
    });
    } catch (error: any) {
      Swal.close();
      this.loading.set(false);
      console.error('Error al llamar al método login:', error);
      this.error = 'Error al iniciar el proceso de autenticación';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: this.error,
        confirmButtonColor: '#d32f2f'
      });
    }
  }

  private verifyAccessCode(): void {
    const code = this._formulario.get('accessCode')?.value;
    const storedCode = this.accessCodeValue();

    if (code === storedCode) {
      // Código correcto, redirigir a administración
      Swal.fire({
        icon: 'success',
        title: '¡Acceso concedido!',
        text: 'Redirigiendo a la administración...',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#1e3c72'
      }).then(() => {
        this.router.navigate(['/admin-map']);
      });
    } else {
      this.error = 'Código de acceso incorrecto';
      Swal.fire({
        icon: 'error',
        title: 'Código Incorrecto',
        text: this.error,
        confirmButtonColor: '#d32f2f'
      });
    }
  }

  closeDialog(): void {
    this.router.navigate(['/inicio']);
  }

  resetForm(): void {
    this.showCodeInput.set(false);
    this.accessCodeValue.set(null);
    this.error = '';
    this.message = '';
    this._formulario.reset();
  }

  getMaskedCode(): string {
    const code = this.accessCodeValue();
    if (!code) return '';

    const codeLength = code.length;
    if (codeLength <= 4) return code;

    const last4Digits = code.substring(codeLength - 4);
    return '*'.repeat(codeLength - 4) + last4Digits;
  }

  registrar(): void {
    if (this._formularioRegistro.invalid) {
      this._formularioRegistro.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor, complete todos los campos correctamente',
        confirmButtonColor: '#d32f2f'
      });
      return;
    }

    // Por ahora solo muestra un mensaje, la funcionalidad se implementará después
    Swal.fire({
      icon: 'info',
      title: 'Registro',
      text: 'La funcionalidad de registro estará disponible próximamente',
      confirmButtonColor: '#1e3c72'
    });
  }
}
