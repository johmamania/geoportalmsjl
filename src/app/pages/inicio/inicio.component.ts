import { Component, AfterViewInit, OnInit, signal } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { Router } from '@angular/router';
import { CategoriasService } from '../../services/categorias.service';
import { GeojsonLayersService, GeoJsonLayer } from '../../services/geojson-layers.service';
import { EstadisticasService } from '../../services/estadisticas.service';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';

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
  showLegend = signal<boolean>(false);

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

  /**
   * Obtiene todas las capas GeoJSON para la leyenda
   */
  get allGeoJsonLayers(): GeoJsonLayer[] {
    return this.geojsonLayersService.getLayers();
  }

  /**
   * Alterna la visibilidad del popup de leyenda
   */
  toggleLegend(): void {
    this.showLegend.set(!this.showLegend());
  }

  irAMiUbicacion(): void {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu navegador.');
      return;
    }

    // Mostrar indicador de carga
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Obteniendo tu ubicación...';
    loadingMessage.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10000;';
    document.body.appendChild(loadingMessage);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.body.removeChild(loadingMessage);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Navegar al mapa con las coordenadas como query params
        this.router.navigate(['/geoportal'], {
          queryParams: {
            lat: latitude,
            lng: longitude,
            showLocation: 'true'
          }
        });
      },
      (error) => {
        document.body.removeChild(loadingMessage);
        let errorMessage = 'Error al obtener tu ubicación.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, permite el acceso a tu ubicación.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener la ubicación.';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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

