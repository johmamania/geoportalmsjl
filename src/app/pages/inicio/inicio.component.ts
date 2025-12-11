import { Component, AfterViewInit, OnInit } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { Router } from '@angular/router';
import { CategoriasService } from '../../services/categorias.service';
import { GeojsonLayersService } from '../../services/geojson-layers.service';
import { EstadisticasService } from '../../services/estadisticas.service';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, AfterViewInit {
  categorias = this.categoriasService.getCategorias();
  geojsonLayers = this.geojsonLayersService.getLayers();

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private geojsonLayersService: GeojsonLayersService,
    private estadisticasService: EstadisticasService
  ) {}

  ngOnInit(): void {
    // Incrementar visitas al sistema cuando se carga la página de inicio
    this.estadisticasService.incrementarVisitasSistema().subscribe({
      next: () => {
        console.log('✅ Visita al sistema registrada');
      },
      error: (err) => {
        console.error('❌ Error al registrar visita al sistema:', err);
      }
    });
  }

  verUbicaciones(id: string): void {
    this.router.navigate(['/geoportal', id]);
  }

  getIconForCategory(id: string): string {
    return this.categoriasService.getIconForCategory(id);
  }

  irAPruebaGeoJSON(): void {
    this.router.navigate(['/geoportal']);
  }

  irAPruebaGeoJSONConCapa(layerId: string): void {
    this.router.navigate(['/geoportal', layerId]);
  }


  ngAfterViewInit(): void {
    const video: any = document.querySelector('.background-video');
    if (video) {
      video.muted = true;
      // Intentar cargar y reproducir el video
      video.play().catch((error: any) => {
        console.warn('Video no disponible, usando fondo alternativo:', error);
        // Ocultar el video si no se puede reproducir
        video.style.display = 'none';
      });
      
      // Manejar error de carga del video
      video.addEventListener('error', () => {
        console.warn('Error al cargar video, usando fondo alternativo');
        video.style.display = 'none';
      });
    }
  }

}

