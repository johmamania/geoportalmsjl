import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { CursosAdminService, Curso } from '../../services/cursos-admin.service';
import { Observable, of } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './cursos.component.html',
  styleUrl: './cursos.component.css'
})
export class CursosComponent implements OnInit {
  cursos: Observable<Curso[]> = of([]);

  constructor(private cursosService: CursosAdminService) { }

  ngOnInit(): void {
    // Solo cargar cursos activos para el componente público
    this.cursos = this.cursosService.getCursosActivos();
  }

  getCategoriaColor(categoria: string): string {
    const colores: { [key: string]: string } = {
      'Tecnología': '#4A90E2',
      'Gestión': '#50C878',
      'Desarrollo': '#FF6B6B',
      'Diseño': '#FFA500',
      'Marketing': '#9B59B6',
      'Otros': '#E74C3C'
    };
    return colores[categoria] || '#6b8e23';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }


  inscribirse(curso: Curso): void {
    Swal.fire({
      icon: 'info',
      title: 'Información',
      text: 'Funcion En desarrollo',
      confirmButtonColor: '#1e3c72'
    });
  }
}

