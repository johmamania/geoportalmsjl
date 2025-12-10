
import { MaterialModule } from '../../material/material.module';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';

import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../environments/environment.development';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CategoriasService } from '../../services/categorias.service';
import { MenuService, MenuItem } from '../../services/menu.service';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [MaterialModule, RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  categorias = this.categoriasService.getCategorias();
  menuItems: MenuItem[] = [];
  isScrolled = false;
  lastScrollTop = 0;
  showToolbar = true;
  isMobile = false;
  menuOpened = false;
  private routerSubscription: any;

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private menuService: MenuService
  ) {
    this.checkIfMobile();
    this.menuItems = this.menuService.getMenuItems();
  }

  checkIfMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkIfMobile();
  }

  toggleMenu(): void {
    this.menuOpened = !this.menuOpened;
  }

  closeMenu(): void {
    this.menuOpened = false;
  }

  ngOnInit(): void {
    this.lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Cerrar el menú cuando cambie la ruta
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMenu();
      });
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // Si el scroll es mayor a 50px, se considera que está scrolleando
    this.isScrolled = currentScroll > 50;

    // Ocultar toolbar al bajar, mostrar al subir
    if (currentScroll > this.lastScrollTop && currentScroll > 100) {
      // Scrolling hacia abajo
      this.showToolbar = false;
    } else if (currentScroll < this.lastScrollTop) {
      // Scrolling hacia arriba
      this.showToolbar = true;
    }

    // Si está en la parte superior, siempre mostrar
    if (currentScroll < 10) {
      this.showToolbar = true;
      this.isScrolled = false;
    }

    this.lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  }

  ngOnDestroy(): void {
    // Limpiar suscripción al router
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  verUbicaciones(id: string): void {
    this.router.navigate(['/geoportal', id]);
  }

  getIconForCategory(id: string): string {
    return this.categoriasService.getIconForCategory(id);
  }
}
