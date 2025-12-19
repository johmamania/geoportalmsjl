import { Component, AfterViewInit, OnInit, OnDestroy, signal } from '@angular/core';
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
export class InicioComponent implements OnInit, AfterViewInit, OnDestroy {
  categorias = this.categoriasService.getCategorias();
  geojsonLayers: GeoJsonLayer[] = [];
  showLegend = signal<boolean>(false);
  currentImageIndex = signal<number>(1);
  isMobile = signal<boolean>(false);
  private imageInterval?: any;
  private resizeListener?: () => void;

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private geojsonLayersService: GeojsonLayersService,
    private estadisticasService: EstadisticasService
  ) {}

  ngOnInit(): void {
    // Detectar si es móvil
    this.checkIfMobile();
    this.resizeListener = () => this.checkIfMobile();
    window.addEventListener('resize', this.resizeListener);

    // Iniciar carrusel de imágenes si es móvil
    if (this.isMobile()) {
      this.startImageCarousel();
    }

    // Incrementar visitas al sistema cuando se carga la página de inicio
    this.estadisticasService.incrementarVisitasSistema().subscribe({
      next: () => {
        console.log('✅ Visita al sistema registrada');
      },
      error: (err) => {
        console.error('❌ Error al registrar visita al sistema:', err);
      }
    });

    // Cargar ubicaciones desde la base de datos
    this.geojsonLayersService.getLayersObservable().subscribe({
      next: (layers) => {
        // Filtrar la capa "gps" (Límite SJL) de la lista visible
        this.geojsonLayers = layers.filter(layer => layer.id !== 'gps');
        console.log('✅ Ubicaciones cargadas desde la base de datos:', this.geojsonLayers.length);
      },
      error: (error) => {
        console.error('❌ Error al cargar ubicaciones desde la base de datos:', error);
        // Usar capas por defecto si hay error
        this.geojsonLayers = this.geojsonLayersService.getLayers().filter(layer => layer.id !== 'gps');
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
    // Solo cargar video si no es móvil
    if (!this.isMobile()) {
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

  ngOnDestroy(): void {
    // Limpiar intervalo cuando se destruye el componente
    if (this.imageInterval) {
      clearInterval(this.imageInterval);
    }
    // Remover listener de resize
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  /**
   * Verifica si el dispositivo es móvil
   */
  private checkIfMobile(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);

    // Si cambia a móvil, iniciar carrusel; si cambia a PC, detenerlo
    if (mobile && !this.imageInterval) {
      this.startImageCarousel();
    } else if (!mobile && this.imageInterval) {
      this.stopImageCarousel();
    }
  }

  /**
   * Inicia el carrusel de imágenes que cambia cada 3 segundos
   */
  private startImageCarousel(): void {
    // Limpiar intervalo anterior si existe
    if (this.imageInterval) {
      clearInterval(this.imageInterval);
    }

    // Cambiar imagen cada 3 segundos (3000ms)
    this.imageInterval = setInterval(() => {
      const currentIndex = this.currentImageIndex();
      const nextIndex = currentIndex >= 7 ? 1 : currentIndex + 1;
      this.currentImageIndex.set(nextIndex);
    }, 3000);
  }

  /**
   * Detiene el carrusel de imágenes
   */
  private stopImageCarousel(): void {
    if (this.imageInterval) {
      clearInterval(this.imageInterval);
      this.imageInterval = undefined;
    }
  }

  /**
   * Obtiene la ruta de la imagen actual
   */
  getCurrentImagePath(): string {
    return `assets/img/fondo/${this.currentImageIndex()}.jpg`;
  }

}

