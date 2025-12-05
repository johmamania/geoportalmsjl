import { Component, signal } from '@angular/core';
import { MaterialModule } from '../material/material.module';
import { NgIf } from '@angular/common';
import { FormControl, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginRequest } from '../model/admin-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MaterialModule, NgIf, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  error: string = '';
  message: string = '';
  _formulario: FormGroup;
  username: string = '';
  password: string = '';
  accessCode: string = '';
  loading = signal(false);
  version: string;
  showCodeInput = signal(false);
  accessCodeValue = signal<string | null>(null);

  year = new Date().getFullYear();

  constructor(
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<LoginComponent>,
    private adminAuthService: AdminAuthService,
    private router: Router,
  ) {
    this._formulario = new FormGroup({
      username: new FormControl("", Validators.required),
      password: new FormControl("", Validators.required),
      accessCode: new FormControl("")
    });
    this.version = environment.VERSION;
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

    this.adminAuthService.login(credentials).subscribe({
      next: (response) => {
        Swal.close();
        this.loading.set(false);

        if (response.success && response.access_code) {
          this.accessCodeValue.set(response.access_code);
          this.showCodeInput.set(true);
          this.message = `Código de acceso generado: ${response.access_code}`;

          // Mostrar código en SweetAlert
          Swal.fire({
            title: 'Código de Acceso Generado',
            html: `
              <div style="text-align: center; padding: 20px;">
                <h2 style="font-family: 'Courier New', monospace; font-size: 32px; color: #1e3c72; letter-spacing: 2px; margin: 20px 0;">
                  ${response.access_code}
                </h2>
                <p style="color: #666; margin-top: 20px;">Ingrese este código para continuar</p>
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
        this.error = 'Error al conectar con el servidor';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.error,
          confirmButtonColor: '#d32f2f'
        });
      }
    });
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
        this.dialogRef.close();
        this.router.navigate(['/admin/admin-map']);
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

  volverAPaginaPrincipal() {
    this.router.navigate(['/geoportal']);
  }

  closeDialog() {
    this.dialogRef.close();
  }





  resetForm() {
    this.showCodeInput.set(false);
    this.accessCodeValue.set(null);
    this.error = '';
    this.message = '';
    this._formulario.reset();
  }

  convertirAMayusculas() {
    if (this.username) {
      this.username = this.username.toUpperCase();
    }
  }
}
