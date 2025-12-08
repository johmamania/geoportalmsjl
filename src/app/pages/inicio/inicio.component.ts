import { Component } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { Router } from '@angular/router';
import { CategoriasService } from '../../services/categorias.service';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent {
  categorias = this.categoriasService.getCategorias();

  constructor(
    private router: Router,
    private categoriasService: CategoriasService
  ) {}

  verUbicaciones(id: string): void {
    this.router.navigate(['/geoportal', id]);
  }

  getIconForCategory(id: string): string {
    return this.categoriasService.getIconForCategory(id);
  }
}

