import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { MatDialog } from '@angular/material/dialog';
import { LoginComponent } from '../../login/login.component';
import { environment } from '../../../environments/environment.development';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent implements OnInit, OnDestroy {
  @Input() alwaysVisible: boolean = false;
  
  version: string;
  year = new Date().getFullYear();
  showFooter: boolean = false;

  constructor(private dialog: MatDialog) {
    this.version = environment.VERSION;
  }

  ngOnInit(): void {
    if (this.alwaysVisible) {
      this.showFooter = true;
    } else {
      // Verificar posición inicial
      setTimeout(() => this.checkScroll(), 100);
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    if (!this.alwaysVisible) {
      this.checkScroll();
    }
  }

  private checkScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    // Mostrar footer cuando se hace scroll hacia abajo más de 100px
    this.showFooter = scrollPosition > 100;
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
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
    });
  }
}

