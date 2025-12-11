import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material/material.module';
import { EstadisticasService } from '../../../services/estadisticas.service';
import { MatTableDataSource } from '@angular/material/table';

interface Estadistica {
  nombre: string;
  contador: number;
}

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './visits.component.html',
  styleUrl: './visits.component.css'
})
export class VisitsComponent implements OnInit {
  estadisticas: Estadistica[] = [];
  dataSource = new MatTableDataSource<Estadistica>([]);
  displayedColumns: string[] = ['nombre', 'contador', 'descripcion'];
  cargando = false;
  error: string | null = null;

  constructor(private estadisticasService: EstadisticasService) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    this.error = null;

    this.estadisticasService.obtenerEstadisticas().subscribe({
      next: (data) => {
        this.estadisticas = data || [];
        this.dataSource.data = this.estadisticas;
        this.cargando = false;
        console.log('✅ Estadísticas cargadas:', this.estadisticas);
      },
      error: (err) => {
        console.error('❌ Error al cargar estadísticas:', err);
        this.error = 'No se pudieron cargar las estadísticas. Por favor, intente nuevamente.';
        this.cargando = false;
      }
    });
  }

  getNombreDisplay(nombre: string): string {
    const nombres: { [key: string]: string } = {
      'visitas_sistema': 'Visitas al Sistema',
      'visitas_mapas': 'Visitas al Geoportal'
    };
    return nombres[nombre] || nombre;
  }

  getIcon(nombre: string): string {
    const iconos: { [key: string]: string } = {
      'visitas_sistema': 'home',
      'visitas_mapas': 'map'
    };
    return iconos[nombre] || 'analytics';
  }

  getIconClass(nombre: string): string {
    const clases: { [key: string]: string } = {
      'visitas_sistema': 'icon-sistema',
      'visitas_mapas': 'icon-mapas'
    };
    return clases[nombre] || '';
  }

  getDescripcion(nombre: string): string {
    const descripciones: { [key: string]: string } = {
      'visitas_sistema': 'Total de visitas registradas a la página de inicio del sistema',
      'visitas_mapas': 'Total de visitas registradas al geoportal y mapas interactivos'
    };
    return descripciones[nombre] || 'Estadística de visitas';
  }
}

