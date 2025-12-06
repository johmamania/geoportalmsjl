import { Component } from '@angular/core';
import { MaterialModule } from '../material/material.module';
import { environment } from '../../environments/environment.development';
import { MatDialog } from '@angular/material/dialog';
import { LoginComponent } from '../login/login.component';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css'
})
export class PrincipalComponent {
  version: string;
  year = new Date().getFullYear();

  categorias = this.categoriasService.getCategorias();

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private categoriasService: CategoriasService
  ) {
    this.version = environment.VERSION;
  }

  login(): void {
    Swal.fire({
      title: 'Confirmar Acceso',
      text: '¿Solo los administradores pueden iniciar sesión, eres administrador del sistema?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#1e3c72',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      focusCancel: false,
      focusConfirm: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Si presiona "Sí", abrir el modal de login
        const isMobile = window.innerWidth <= 600;
        const isTablet = window.innerWidth > 600 && window.innerWidth <= 1024;

        this.dialog.open(LoginComponent, {
          disableClose: false,
          autoFocus: true,
          width: isMobile ? '95vw' : isTablet ? '90vw' : '400px',
          maxWidth: isMobile ? '100%' : isTablet ? '500px' : '400px',
          maxHeight: '90vh',
          panelClass: 'login-dialog-panel'
        });
      }
      // Si presiona "No" o cierra el alert, no hacer nada
    });
  }

  verUbicaciones(id: string): void {
    this.router.navigate(['/geoportal', id]);
  }

  getIconForCategory(id: string): string {
    return this.categoriasService.getIconForCategory(id);
  }
}
