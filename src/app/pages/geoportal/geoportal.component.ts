import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Style, Icon, Stroke, Text, Fill, Circle as CircleStyle } from 'ol/style';
import { AfterViewInit, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { EventType, RouterOutlet, ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.development';
import { WmsService } from '../../services/wms.service';
import { WMSLayerConfig } from '../../model/wms-layer-info';
import { KeyValuePipe } from '@angular/common';
import { MapDataService } from '../../services/map-data.service';
import { MapPoint } from '../../model/map-point';
import BaseEvent from 'ol/events/Event';
import { EventTypes } from 'ol/Observable';
import { CategoriasService } from '../../services/categorias.service';
import { RoutingService } from '../../services/routing.service';
import Swal from 'sweetalert2';
import { FooterComponent } from '../footer/footer.component';


@Component({
  selector: 'app-geoportal',
  standalone: true,
  imports: [MaterialModule, RouterOutlet, KeyValuePipe, FooterComponent],
  templateUrl: './geoportal.component.html',
  styleUrl: './geoportal.component.css'
})
export class GeoportalComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: Map;
  private marcadorLayer?: VectorLayer<VectorSource>;
  private routeLayer?: VectorLayer<VectorSource>; // Capa para las rutas
  private routeMarkersLayer?: VectorLayer<VectorSource>; // Capa para marcadores de inicio y fin de ruta
  private currentLocationMarker?: Feature;
  private routeStartMarker?: Feature; // Marcador de inicio de ruta
  private routeEndMarker?: Feature; // Marcador de fin de ruta
  private popupOverlay?: Overlay;
  private baseLayer?: TileLayer<any>;
  version: string;
  wmsLayersMenuOpen: boolean = false;
  selectedMapType = signal<string>('osm');
  showLegend = signal<boolean>(false);
  mapTypeToolbarHidden = signal<boolean>(false); // Controla si el toolbar está oculto en desktop
  categoryId: string | null = null; // ID de categoría recibido de la ruta
  isMobile = signal<boolean>(false); // Detecta si es móvil
  private resizeHandler = () => this.checkIfMobile(); // Referencia para poder remover el listener
  private currentLocation: { latitude: number; longitude: number } | null = null; // Ubicación actual del usuario
  selectedTransportType = signal<string>('walking'); // Tipo de transporte: walking, driving, cycling
  selectedTransportName = signal<string>('A Pie'); // Nombre del transporte seleccionado
  currentRouteFeature?: Feature; // Feature de la ruta actual

  // Tipos de mapas disponibles
  mapTypes = [
    { id: 'osm', name: 'OpenStreetMap', icon: 'map' },
    { id: 'satellite', name: 'Satelital', icon: 'satellite' },
    { id: 'topo', name: 'Topográfico', icon: 'terrain' },
    { id: 'cartodb', name: 'CartoDB Positron', icon: 'layers' }
  ];

  // Configuración de capas WMS oficiales del Perú
  wmsLayersConfig: WMSLayerConfig[] = [
    // IGN - Instituto Geográfico Nacional
    {
      name: 'ign_limite_distrital',
      displayName: 'Límite Distrital (IGN)',
      url: 'https://www.idep.gob.pe/geoserver/idep/wms',
      layerName: 'idep:limite_distrital',
      opacity: 0.7,
      category: 'IGN - Límites Administrativos'
    },
    {
      name: 'ign_limite_provincial',
      displayName: 'Límite Provincial (IGN)',
      url: 'https://www.idep.gob.pe/geoserver/idep/wms',
      layerName: 'idep:limite_provincial',
      opacity: 0.7,
      category: 'IGN - Límites Administrativos'
    },
    {
      name: 'ign_limite_departamental',
      displayName: 'Límite Departamental (IGN)',
      url: 'https://www.idep.gob.pe/geoserver/idep/wms',
      layerName: 'idep:limite_departamental',
      opacity: 0.7,
      category: 'IGN - Límites Administrativos'
    },
    // CENEPRED - Centro Nacional de Estimación, Prevención y Reducción del Riesgo de Desastres
    {
      name: 'cenepred_escenarios_riesgo',
      displayName: 'Escenarios de Riesgo (CENEPRED)',
      url: 'https://geoserver.cenepred.gob.pe/geoserver/wms',
      layerName: 'cenepred:escenarios_riesgo',
      opacity: 0.6,
      category: 'CENEPRED - Riesgos'
    },
    // MTC - Ministerio de Transportes y Comunicaciones
    {
      name: 'mtc_red_vial_nacional',
      displayName: 'Red Vial Nacional (MTC)',
      url: 'https://geoserver.mtc.gob.pe/geoserver/wms',
      layerName: 'mtc:red_vial_nacional',
      opacity: 0.8,
      category: 'MTC - Infraestructura'
    }
  ];

  // Diccionario simple de distritos -> coordenadas (lat, lng)
  private distritos: { [key: string]: [number, number] } = {
    'san juan de lurigancho': [-12.0017, -76.9991],
    'sjl': [-12.0017, -76.9991]
    // Aquí puedes ir agregando más distritos si lo necesitas
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private wmsService: WmsService,
    private mapDataService: MapDataService,
    private categoriasService: CategoriasService,
    private routingService: RoutingService
  ) {
    this.version = environment.VERSION;
  }

  ngOnInit(): void {
    // Detectar si es móvil
    this.checkIfMobile();
    window.addEventListener('resize', this.resizeHandler);

    // En desktop, mostrar la leyenda siempre
    if (!this.isMobile()) {
      this.showLegend.set(true);
    }

    // Obtener el parámetro id de la ruta
    this.route.params.subscribe(params => {
      this.categoryId = params['id'] || null;
      console.log('Categoría recibida:', this.categoryId);

      // Si hay un id y el mapa ya está inicializado, recargar los puntos
      if (this.map && this.marcadorLayer) {
        this.loadPointsFromSupabase();
      }
    });
  }

  /**
   * Detecta si el dispositivo es móvil
   */
  private checkIfMobile(): void {
    this.isMobile.set(window.innerWidth <= 768);
  }

  /**
   * Obtiene las categorías del servicio
   */
  getCategorias() {
    return this.categoriasService.getCategorias();
  }

  /**
   * Obtiene la URL del icono según el id de categoría
   */
  getIconUrlByCategoryId(id: string): string {
    const baseUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-';

    if (id === '1') {
      return `${baseUrl}blue.png`;
    } else if (id === '2') {
      return `${baseUrl}green.png`;
    } else if (id === '3') {
      return `${baseUrl}violet.png`;
    } else {
      return `${baseUrl}blue.png`;
    }
  }

  /**
   * Filtra los puntos por categoría y navega
   */
  filtrarPorCategoria(id: string): void {
    // Obtener el nombre de la categoría para el mensaje
    let categoriaNombre = 'Todas las ubicaciones';
    if (id && id !== '0') {
      const categoria = this.categoriasService.getCategorias().find(c => c.id === id);
      categoriaNombre = categoria ? categoria.nombre : `Categoría ${id}`;
    }

    // Mostrar indicador de carga antes de navegar
    this.showLoadingAlert(categoriaNombre);

    // Navegar a la nueva ruta
    this.router.navigate(['/geoportal', id]);
  }

  ngAfterViewInit(): void {
    // Delay para asegurar que el DOM esté completamente renderizado
    // Aumentado a 300ms para dar tiempo a que Angular Material renderice completamente
    setTimeout(() => {
      this.initMap();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
    window.removeEventListener('resize', this.resizeHandler);
  }

  private initMap(): void {
    // Verificar que el elemento exista
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado');
      return;
    }

    // Coordenadas de San Juan de Lurigancho (lat, lng)
    const center = fromLonLat([-76.9991, -12.0017]); // Convertir a EPSG:3857

    // Crear capa base inicial (OpenStreetMap)
    this.baseLayer = new TileLayer({
      source: new OSM()
    });

    this.map = new Map({
      target: 'map',
      layers: [this.baseLayer],
      view: new View({
        center: center,
        zoom: 13
      })
    });

    // Asegurar que el mapa se renderice correctamente después de que Angular Material termine
    setTimeout(() => {
      if (this.map) {
        this.map.updateSize();
      }
    }, 500);

    // Inicializar el servicio WMS
    this.wmsService.initialize(this.map);

    // Crear capa de marcadores (z-index alto para que esté sobre las capas WMS)
    this.marcadorLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 1000 // Por encima de las capas WMS
    });
    this.map.addLayer(this.marcadorLayer);

    // Crear capa de rutas
    this.routeLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 999, // Por debajo de los marcadores pero sobre las capas base
      style: new Style({
        stroke: new Stroke({
          color: '#3a9b37', // Verde para la ruta más cercana
          width: 5
        })
      })
    });
    this.map.addLayer(this.routeLayer);

    // Crear capa para marcadores de inicio y fin de ruta
    this.routeMarkersLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 1001 // Por encima de todo
    });
    this.map.addLayer(this.routeMarkersLayer);

    // Agregar interacción de clic al mapa para los marcadores
    this.map.on('click', (event) => {
      const feature = this.map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
        {
          layerFilter: (layer) => layer === this.marcadorLayer
        }
      );
      if (feature) {
        const point = feature.get('pointData') as MapPoint;
        if (point) {
          const geometry = feature.getGeometry();
          if (geometry instanceof Point) {
            const coordinates = geometry.getCoordinates();
            this.showPointOptionsMenu(point, coordinates);
          }
        }
      }
    });

    // Cambiar cursor cuando se pasa sobre un marcador
    this.map.on('pointermove', (event) => {
      const feature = this.map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
        {
          layerFilter: (layer) => layer === this.marcadorLayer
        }
      );
      const mapElement = this.map.getTargetElement();
      if (mapElement) {
        if (feature) {
          mapElement.style.cursor = 'pointer';
        } else {
          mapElement.style.cursor = '';
        }
      }
    });

    // Crear overlay para popup
    const popupElement = document.createElement('div');
    popupElement.className = 'ol-popup';
    const popupCloser = document.createElement('a');
    popupCloser.className = 'ol-popup-closer';
    popupCloser.href = '#';
    popupCloser.innerHTML = '×';
    popupElement.appendChild(popupCloser);

    popupCloser.addEventListener('click', (evt) => {
      evt.preventDefault();
      this.popupOverlay?.setPosition(undefined);
      popupCloser.blur();
      return false;
    });

    this.popupOverlay = new Overlay({
      element: popupElement,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });
    this.map.addOverlay(this.popupOverlay);

    // Ajustar tamaño del mapa cuando cambie el tamaño de la ventana
    window.addEventListener('resize', () => {
      this.map.updateSize();
    });

    // Obtener y marcar ubicación actual del usuario
    this.getCurrentLocation();

    // Cargar puntos desde Supabase
    this.loadPointsFromSupabase();
  }

  /**
   * Obtiene la ubicación actual del usuario y la marca en el mapa
   */
  private getCurrentLocation(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no está disponible en este navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Guardar la ubicación actual
        this.currentLocation = { latitude, longitude };

        // Convertir coordenadas a EPSG:3857
        const center = fromLonLat([longitude, latitude]);

        // Crear marcador para la ubicación actual
        this.currentLocationMarker = new Feature({
          geometry: new Point(center),
          name: 'Mi Ubicación',
          description: 'Ubicación actual'
        });

        // Estilo para el marcador de ubicación actual usando icono rojo de GitHub
        this.currentLocationMarker.setStyle(new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            scale: 0.5, // Escala aumentada en 4px aproximadamente
            opacity: 1
          })
        }));

        // Agregar el marcador a la capa
        if (this.marcadorLayer) {
          this.marcadorLayer.getSource()?.addFeature(this.currentLocationMarker);
        }

        // Opcional: Centrar el mapa en la ubicación actual (comentado para no cambiar la vista inicial)
        // const view = this.map.getView();
        // view.animate({
        //   center: center,
        //   zoom: 15,
        //   duration: 1000
        // });

        console.log('Ubicación actual marcada:', { latitude, longitude });
      },
      (error) => {
        console.warn('Error al obtener la ubicación:', error.message);
        // No hacer nada si el usuario deniega el permiso o hay un error
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  /**
   * Muestra el indicador de carga
   */
  private showLoadingAlert(categoriaNombre: string = ''): void {
    const mensaje = categoriaNombre
      ? `Cargando ubicaciones: ${categoriaNombre}...`
      : 'Cargando ubicaciones...';

    Swal.fire({
      title: mensaje,
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
          <div class="swal2-loader" style="margin: 20px auto;"></div>
          <button id="cancel-loading-btn"
                  style="margin-top: 30px; padding: 10px 30px; background-color: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 500;">
            Cancelar
          </button>
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: true,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();

        // Agregar evento al botón cancelar
        const cancelBtn = document.getElementById('cancel-loading-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            this.closeLoadingAlert();
          });
        }
      }
    });
  }

  /**
   * Cierra el indicador de carga
   */
  private closeLoadingAlert(): void {
    Swal.close();
  }

  /**
   * Carga puntos desde Supabase y los muestra en el mapa
   * Se ejecuta cada vez que se entra al componente
   */
  private loadPointsFromSupabase(): void {
    // Verificar que el mapa y la capa de marcadores estén inicializados
    if (!this.map || !this.marcadorLayer) {
      console.warn('Mapa no inicializado, reintentando en 500ms...');
      setTimeout(() => this.loadPointsFromSupabase(), 500);
      return;
    }

    console.log('Iniciando carga de puntos desde Supabase...');
    console.log('Filtro por categoría:', this.categoryId === '0' ? 'Todas las categorías' : `Categoría ${this.categoryId}`);

    // Obtener el nombre de la categoría para el mensaje
    let categoriaNombre = 'Todas las ubicaciones';
    if (this.categoryId && this.categoryId !== '0') {
      const categoria = this.categoriasService.getCategorias().find(c => c.id === this.categoryId);
      categoriaNombre = categoria ? categoria.nombre : `Categoría ${this.categoryId}`;
    }

    // Mostrar indicador de carga
    this.showLoadingAlert(categoriaNombre);

    // Usar getPointsSinAutorizacion para producción (sin requerir autenticación)
    this.mapDataService.getPointsSinAutorizacion().subscribe({
      next: (points) => {
        if (points && Array.isArray(points)) {
          console.log(`✅ Puntos cargados exitosamente: ${points.length} puntos`);

          // Filtrar puntos según el id de categoría
          const filteredPoints = this.filterPointsByCategory(points);
          console.log(`✅ Puntos filtrados: ${filteredPoints.length} puntos`);

          this.renderPointsOnMap(filteredPoints);

          // Cerrar indicador de carga
          this.closeLoadingAlert();
        } else {
          console.warn('⚠️ No se recibieron puntos válidos');
          this.closeLoadingAlert();
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar puntos sin autorización:', error);
        // Intentar con el método alternativo si falla
        console.log('Intentando método alternativo...');
        this.mapDataService.getPoints().subscribe({
          next: (points) => {
            if (points && Array.isArray(points)) {
              console.log(`✅ Puntos cargados (método alternativo): ${points.length} puntos`);

              // Filtrar puntos según el id de categoría
              const filteredPoints = this.filterPointsByCategory(points);
              console.log(`✅ Puntos filtrados: ${filteredPoints.length} puntos`);

              this.renderPointsOnMap(filteredPoints);

              // Cerrar indicador de carga
              this.closeLoadingAlert();
            } else {
              this.closeLoadingAlert();
            }
          },
          error: (err) => {
            console.error('❌ Error al cargar puntos (método alternativo):', err);
            this.closeLoadingAlert();
          }
        });
      }
    });
  }

  /**
   * Filtra los puntos según el id de categoría recibido
   * Si el id es '0' o null, retorna todos los puntos
   * Si el id es '1', '2', o '3', filtra por esa categoría
   */
  private filterPointsByCategory(points: MapPoint[]): MapPoint[] {
    // Si el id es '0' o null, mostrar todos los puntos
    if (!this.categoryId || this.categoryId === '0') {
      return points;
    }

    // Filtrar por categoría
    return points.filter(point => point.category === this.categoryId);
  }

  /**
   * Renderiza los puntos en el mapa
   */
  private renderPointsOnMap(points: MapPoint[]): void {
    if (!this.map || !this.marcadorLayer) {
      return;
    }

    // Guardar el marcador de ubicación actual antes de limpiar
    const currentLocationFeature = this.currentLocationMarker;

    // Limpiar marcadores existentes
    this.marcadorLayer.getSource()?.clear();

    // Restaurar el marcador de ubicación actual si existe
    if (currentLocationFeature) {
      this.marcadorLayer.getSource()?.addFeature(currentLocationFeature);
      this.currentLocationMarker = currentLocationFeature;
    }

    // Agregar cada punto como marcador
    points.forEach(point => {
      if (point.latitude && point.longitude) {
        const center = fromLonLat([point.longitude, point.latitude]);

        const marker = new Feature({
          geometry: new Point(center),
          name: point.name,
          description: point.description,
          pointData: point // Guardar los datos completos del punto
        });

        // Estilo personalizado usando el icono según la categoría
        const iconUrl = this.getIconUrlByCategory(point.category);

        marker.setStyle(new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: iconUrl,
            scale: 0.50 // Escala aumentada en 4px aproximadamente
          })
        }));

        this.marcadorLayer?.getSource()?.addFeature(marker);
      }
    });
  }

  /**
   * Obtiene la URL del icono según la categoría
   */
  private getIconUrlByCategory(category?: string): string {
    // Colores según categoría:
    // Categoría 1: Azul
    // Categoría 2: Verde
    // Categoría 3: Morado
    const baseUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-';

    if (category === '1') {
      return `${baseUrl}blue.png`;
    } else if (category === '2') {
      return `${baseUrl}green.png`;
    } else if (category === '3') {
      return `${baseUrl}violet.png`; // Morado/Violeta
    } else {
      // Por defecto, usar azul
      return `${baseUrl}blue.png`;
    }
  }

  /**
   * Toggle para mostrar/ocultar la leyenda
   */
  toggleLegend(): void {
    this.showLegend.set(!this.showLegend());
  }

  /**
   * Muestra un menú de opciones cuando se hace clic en un punto
   */
  private showPointOptionsMenu(point: MapPoint, position: number[]): void {
    if (!this.popupOverlay) {
      return;
    }

    const popupElement = this.popupOverlay.getElement();
    if (popupElement) {
      // Establecer estilos del contenedor del popup
      popupElement.style.background = '#ffffff';
      popupElement.style.borderRadius = '8px';
      popupElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      popupElement.style.minWidth = '250px';
      popupElement.style.maxWidth = '350px';
      popupElement.style.position = 'relative';

      const content = document.createElement('div');
      content.style.padding = '16px';
      content.style.paddingTop = '40px'; // Espacio para el botón cerrar
      content.innerHTML = `
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 20px; color: #1e3c72; text-align: center;">${point.name}</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="btn-ver-info" style="padding: 12px 20px; background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>ℹ️</span>
            <span>Ver Información</span>
          </button>
          <button id="btn-como-llegar" style="padding: 12px 20px; background: linear-gradient(135deg, #3a9b37 0%, #1ba00f 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>🗺️</span>
            <span>Cómo Llegar</span>
          </button>
        </div>
      `;

      // Crear o mantener el botón de cerrar
      let closer = popupElement.querySelector('.ol-popup-closer') as HTMLAnchorElement;
      popupElement.innerHTML = '';

      if (!closer) {
        closer = document.createElement('a');
        closer.className = 'ol-popup-closer';
        closer.href = '#';
        closer.innerHTML = '×';
        closer.addEventListener('click', (evt) => {
          evt.preventDefault();
          this.popupOverlay?.setPosition(undefined);
          return false;
        });
      }

      // Estilos del botón cerrar
      closer.style.position = 'absolute';
      closer.style.top = '8px';
      closer.style.right = '8px';
      closer.style.width = '28px';
      closer.style.height = '28px';
      closer.style.display = 'flex';
      closer.style.alignItems = 'center';
      closer.style.justifyContent = 'center';
      closer.style.background = '#f5f5f5';
      closer.style.borderRadius = '50%';
      closer.style.color = '#333';
      closer.style.fontSize = '20px';
      closer.style.fontWeight = 'bold';
      closer.style.textDecoration = 'none';
      closer.style.cursor = 'pointer';
      closer.style.transition = 'all 0.2s ease';
      closer.style.zIndex = '1000';

      closer.onmouseenter = () => {
        closer.style.background = '#e0e0e0';
        closer.style.color = '#000';
        closer.style.transform = 'scale(1.1)';
      };
      closer.onmouseleave = () => {
        closer.style.background = '#f5f5f5';
        closer.style.color = '#333';
        closer.style.transform = 'scale(1)';
      };

      popupElement.appendChild(closer);
      popupElement.appendChild(content);
      this.popupOverlay.setPosition(position);

      // Event listeners para los botones
      const btnVerInfo = document.getElementById('btn-ver-info');
      const btnComoLlegar = document.getElementById('btn-como-llegar');

      if (btnVerInfo) {
        btnVerInfo.addEventListener('click', () => {
          this.showPointInfo(point, position);
        });
      }

      if (btnComoLlegar) {
        btnComoLlegar.addEventListener('click', () => {
          this.showRouteOptions(point, position);
        });
      }
    }
  }

  /**
   * Muestra un popup con información del punto
   */
  private showPointInfo(point: MapPoint, position: number[]): void {
    if (!this.popupOverlay) {
      return;
    }

    const popupElement = this.popupOverlay.getElement();
    if (popupElement) {
      popupElement.style.background = '#ffffff';
      popupElement.style.borderRadius = '8px';
      popupElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      popupElement.style.minWidth = '250px';
      popupElement.style.maxWidth = '350px';
      popupElement.style.position = 'relative';

      const content = document.createElement('div');
      content.style.padding = '16px';
      content.style.paddingTop = '40px';
      content.innerHTML = `
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #1e3c72;">${point.name}</div>
        ${point.description ? `<div style="color: #666; margin-bottom: 10px; line-height: 1.5;">${point.description}</div>` : ''}
        ${point.category ? `<div style="color: #999; font-size: 13px; margin-bottom: 8px;"><strong>Categoría:</strong> ${point.category}</div>` : ''}
        <div style="color: #999; font-size: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <strong>Coordenadas:</strong><br>
          Lat: ${point.latitude.toFixed(6)}, Lng: ${point.longitude.toFixed(6)}
        </div>
      `;

      let closer = popupElement.querySelector('.ol-popup-closer') as HTMLAnchorElement;
      popupElement.innerHTML = '';

      if (!closer) {
        closer = document.createElement('a');
        closer.className = 'ol-popup-closer';
        closer.href = '#';
        closer.innerHTML = '×';
        closer.addEventListener('click', (evt) => {
          evt.preventDefault();
          this.popupOverlay?.setPosition(undefined);
          return false;
        });
      }

      closer.style.position = 'absolute';
      closer.style.top = '8px';
      closer.style.right = '8px';
      closer.style.width = '28px';
      closer.style.height = '28px';
      closer.style.display = 'flex';
      closer.style.alignItems = 'center';
      closer.style.justifyContent = 'center';
      closer.style.background = '#f5f5f5';
      closer.style.borderRadius = '50%';
      closer.style.color = '#333';
      closer.style.fontSize = '20px';
      closer.style.fontWeight = 'bold';
      closer.style.textDecoration = 'none';
      closer.style.cursor = 'pointer';
      closer.style.transition = 'all 0.2s ease';
      closer.style.zIndex = '1000';

      closer.onmouseenter = () => {
        closer.style.background = '#e0e0e0';
        closer.style.color = '#000';
        closer.style.transform = 'scale(1.1)';
      };
      closer.onmouseleave = () => {
        closer.style.background = '#f5f5f5';
        closer.style.color = '#333';
        closer.style.transform = 'scale(1)';
      };

      popupElement.appendChild(closer);
      popupElement.appendChild(content);
      this.popupOverlay.setPosition(position);
    }
  }

  /**
   * Muestra opciones de transporte y calcula la ruta
   */
  private showRouteOptions(point: MapPoint, position: number[]): void {
    if (!this.currentLocation) {
      Swal.fire({
        icon: 'warning',
        title: 'Ubicación no disponible',
        text: 'No se pudo obtener tu ubicación actual. Por favor, permite el acceso a la ubicación.',
        confirmButtonColor: '#4A90E2'
      });
      this.popupOverlay?.setPosition(undefined);
      return;
    }

    if (!this.popupOverlay) {
      return;
    }

    const popupElement = this.popupOverlay.getElement();
    if (popupElement) {
      popupElement.style.background = '#ffffff';
      popupElement.style.borderRadius = '8px';
      popupElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      popupElement.style.minWidth = '280px';
      popupElement.style.maxWidth = '400px';
      popupElement.style.position = 'relative';

      const content = document.createElement('div');
      content.style.padding = '16px';
      content.style.paddingTop = '40px';
      content.innerHTML = `
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 16px; color: #1e3c72; text-align: center;">Cómo Llegar a ${point.name}</div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">Selecciona el medio de transporte:</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button id="transport-walking" class="transport-btn active" data-transport="walking" data-name="A Pie" data-profile="walking" style="padding: 10px; background: #4A90E2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
              🚶 A Pie
            </button>
            <button id="transport-bus" class="transport-btn" data-transport="driving" data-name="En Bus" data-profile="driving" style="padding: 10px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
              🚌 En Bus
            </button>
            <button id="transport-taxi" class="transport-btn" data-transport="driving" data-name="En Taxi" data-profile="driving" style="padding: 10px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
              🚕 Taxi
            </button>
            <button id="transport-bike" class="transport-btn" data-transport="cycling" data-name="En Bicicleta" data-profile="cycling" style="padding: 10px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
              🚲 Bicicleta
            </button>
          </div>
        </div>
        <div id="route-info" style="padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px; text-align: center; font-weight: 500; color: #333;">
          Calculando ruta...
        </div>
        <button id="btn-cerrar-ruta" style="width: 100%; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
          Cerrar Ruta
        </button>
      `;

      let closer = popupElement.querySelector('.ol-popup-closer') as HTMLAnchorElement;
      popupElement.innerHTML = '';

      if (!closer) {
        closer = document.createElement('a');
        closer.className = 'ol-popup-closer';
        closer.href = '#';
        closer.innerHTML = '×';
        closer.addEventListener('click', (evt) => {
          evt.preventDefault();
          this.clearRoute();
          this.popupOverlay?.setPosition(undefined);
          return false;
        });
      }

      closer.style.position = 'absolute';
      closer.style.top = '8px';
      closer.style.right = '8px';
      closer.style.width = '28px';
      closer.style.height = '28px';
      closer.style.display = 'flex';
      closer.style.alignItems = 'center';
      closer.style.justifyContent = 'center';
      closer.style.background = '#f5f5f5';
      closer.style.borderRadius = '50%';
      closer.style.color = '#333';
      closer.style.fontSize = '20px';
      closer.style.fontWeight = 'bold';
      closer.style.textDecoration = 'none';
      closer.style.cursor = 'pointer';
      closer.style.transition = 'all 0.2s ease';
      closer.style.zIndex = '1000';

      popupElement.appendChild(closer);
      popupElement.appendChild(content);
      this.popupOverlay.setPosition(position);

      // Event listeners para los botones de transporte
      const transportButtons = popupElement.querySelectorAll('.transport-btn');
      transportButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          // Remover clase active de todos
          transportButtons.forEach(b => {
            (b as HTMLElement).style.background = '#e0e0e0';
            (b as HTMLElement).style.color = '#333';
          });
          // Agregar clase active al seleccionado
          (btn as HTMLElement).style.background = '#4A90E2';
          (btn as HTMLElement).style.color = 'white';

          const transportProfile = (btn as HTMLElement).dataset['profile'] || 'walking';
          const transportName = (btn as HTMLElement).dataset['name'] || 'A Pie';

          console.log(`Transporte seleccionado: ${transportName} (perfil: ${transportProfile})`);

          // Establecer el perfil según el botón seleccionado
          if (transportProfile === 'cycling') {
            this.selectedTransportType.set('cycling');
          } else if (transportProfile === 'driving') {
            this.selectedTransportType.set('driving');
          } else {
            this.selectedTransportType.set('walking');
          }

          this.selectedTransportName.set(transportName);

          // Limpiar ruta anterior antes de calcular nueva
          this.clearRoute();

          // Pequeño delay para asegurar que el estado se actualice
          setTimeout(() => {
            this.calculateRoute(point);
          }, 100);
        });
      });

      // Botón cerrar ruta
      const btnCerrarRuta = document.getElementById('btn-cerrar-ruta');
      if (btnCerrarRuta) {
        btnCerrarRuta.addEventListener('click', () => {
          this.clearRoute();
          this.popupOverlay?.setPosition(undefined);
        });
      }

      // Calcular ruta inicial (a pie por defecto)
      this.selectedTransportType.set('walking');
      this.selectedTransportName.set('A Pie');
      this.calculateRoute(point);
    }
  }

  /**
   * Calcula la ruta usando el servicio de routing
   */
  private calculateRoute(destination: MapPoint): void {
    if (!this.currentLocation || !this.routeLayer) {
      return;
    }

    const transport = this.selectedTransportType();
    const transportName = this.selectedTransportName();

    // Mapear el tipo de transporte al perfil de OSRM
    let profile: 'driving' | 'walking' | 'cycling' = 'walking';

    if (transport === 'cycling') {
      profile = 'cycling';
    } else if (transport === 'driving') {
      profile = 'driving';
    } else {
      profile = 'walking';
    }

    console.log(`📍 Calculando ruta: ${transportName}`);
    console.log(`   Tipo: ${transport}`);
    console.log(`   Perfil OSRM: ${profile}`);

    // Limpiar ruta anterior
    this.clearRoute();

    // Mostrar loading
    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
      routeInfo.textContent = 'Calculando ruta...';
      routeInfo.style.color = '#333';
    }

    // Usar el servicio de routing
    const origin: [number, number] = [this.currentLocation.longitude, this.currentLocation.latitude];
    const dest: [number, number] = [destination.longitude, destination.latitude];

    this.routingService.getRoute(origin, dest, profile).subscribe({
      next: (response) => {
        const route = response.routes[0];
        const geometry = route.geometry;

        // Convertir coordenadas GeoJSON a OpenLayers
        const coordinates = geometry.coordinates.map((coord: [number, number]) =>
          fromLonLat([coord[0], coord[1]])
        );

        // Crear feature de línea
        const routeFeature = new Feature({
          geometry: new LineString(coordinates)
        });

        // Estilo de la ruta - siempre en verde
        const color = '#3a9b37'; // Verde para la ruta más cercana

        routeFeature.setStyle(new Style({
          stroke: new Stroke({
            color: color,
            width: 5,
            lineDash: []
          })
        }));

        this.routeLayer?.getSource()?.addFeature(routeFeature);
        this.currentRouteFeature = routeFeature;

        // Agregar marcadores de inicio y fin
        this.addRouteMarkers(origin, dest, transport);

        // Actualizar información de la ruta
        const distance = route.distance; // en metros
        const duration = route.duration; // en segundos

        let distanceText = '';
        if (distance >= 1000) {
          distanceText = `${(distance / 1000).toFixed(2)} km`;
        } else {
          distanceText = `${Math.round(distance)} m`;
        }

        let durationText = '';
        if (duration >= 3600) {
          const hours = Math.floor(duration / 3600);
          const minutes = Math.floor((duration % 3600) / 60);
          durationText = `${hours}h ${minutes}m`;
        } else {
          durationText = `${Math.floor(duration / 60)} min`;
        }

        // Usar el nombre del transporte seleccionado
        const transportName = this.selectedTransportName();

        if (routeInfo) {
          routeInfo.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">${transportName}</div>
            <div style="font-size: 14px;">Distancia: ${distanceText}</div>
            <div style="font-size: 14px;">Tiempo estimado: ${durationText}</div>
          `;
        }

        // Ajustar vista del mapa para mostrar toda la ruta
        const extent = routeFeature.getGeometry()?.getExtent();
        if (extent && this.map) {
          this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
          });
        }
      },
      error: (error) => {
        console.error('Error al calcular la ruta:', error);
        if (routeInfo) {
          routeInfo.textContent = error.message || 'Error al calcular la ruta';
          routeInfo.style.color = '#dc3545';
        }
      }
    });
  }

  /**
   * Agrega marcadores de inicio y fin de ruta con iconos según el transporte
   */
  private addRouteMarkers(origin: [number, number], destination: [number, number], transportType: string): void {
    if (!this.routeMarkersLayer) {
      return;
    }

    // Limpiar marcadores anteriores
    this.routeMarkersLayer.getSource()?.clear();

    // Obtener icono según el tipo de transporte
    const startIconUrl = this.getTransportIcon(transportType);

    // Coordenadas convertidas
    const startCoord = fromLonLat([origin[0], origin[1]]);
    const endCoord = fromLonLat([destination[0], destination[1]]);

    // Crear marcador de inicio (Punto de Partida)
    const startMarker = new Feature({
      geometry: new Point(startCoord),
      name: 'Punto de Partida'
    });

    startMarker.setStyle(new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: startIconUrl,
        scale: 0.6
      }),
      text: new Text({
        text: 'Punto de Partida',
        offsetY: -55,
        font: 'bold 14px Arial',
        fill: new Fill({ color: '#1e3c72' }),
        stroke: new Stroke({
          color: '#fff',
          width: 3
        })
      })
    }));

    // Crear marcador de fin (Punto de Llegada)
    const endMarker = new Feature({
      geometry: new Point(endCoord),
      name: 'Punto de Llegada'
    });

    endMarker.setStyle(new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        scale: 0.6
      }),
      text: new Text({
        text: 'Punto de Llegada',
        offsetY: -55,
        font: 'bold 14px Arial',
        fill: new Fill({ color: '#1e3c72' }),
        stroke: new Stroke({
          color: '#fff',
          width: 3
        })
      })
    }));

    // Agregar marcadores a la capa
    this.routeMarkersLayer.getSource()?.addFeature(startMarker);
    this.routeMarkersLayer.getSource()?.addFeature(endMarker);
    this.routeStartMarker = startMarker;
    this.routeEndMarker = endMarker;
  }

  /**
   * Obtiene el icono según el tipo de transporte
   */
  private getTransportIcon(transportType: string): string {
    switch(transportType) {
      case 'walking':
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
      case 'driving':
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png';
      case 'cycling':
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';
      default:
        return 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
    }
  }

  /**
   * Limpia la ruta del mapa
   */
  private clearRoute(): void {
    if (this.routeLayer) {
      this.routeLayer.getSource()?.clear();
      this.currentRouteFeature = undefined;
    }
    if (this.routeMarkersLayer) {
      this.routeMarkersLayer.getSource()?.clear();
      this.routeStartMarker = undefined;
      this.routeEndMarker = undefined;
    }
  }

  buscarDistrito(termino: string): void {
    if (!this.map) {
      return;
    }

    const key = termino.trim().toLowerCase();
    if (!key) {
      return;
    }

    const coords = this.distritos[key];
    if (!coords) {
      alert('Distrito no encontrado. Intente con "San Juan de Lurigancho" o "SJL".');
      return;
    }

    // Convertir coordenadas lat/lng a EPSG:3857
    const center = fromLonLat([coords[1], coords[0]]);

    // Centrar mapa con animación
    const view = this.map.getView();
    view.animate({
      center: center,
      zoom: 14,
      duration: 1000
    });

    // Limpiar marcador anterior
    if (this.marcadorLayer) {
      this.marcadorLayer.getSource()?.clear();
    }

    // Crear nuevo marcador
    const marker = new Feature({
      geometry: new Point(center)
    });

    marker.setStyle(new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        scale: 0.5
      })
    }));

    if (this.marcadorLayer) {
      this.marcadorLayer.getSource()?.addFeature(marker);
    }

    // Mostrar popup
    if (this.popupOverlay) {
      const popupElement = this.popupOverlay.getElement();
      if (popupElement) {
        const content = document.createElement('div');
        content.style.padding = '8px';
        content.innerHTML = `<strong>Distrito:</strong> ${termino}`;
        // Mantener el botón de cerrar
        const closer = popupElement.querySelector('.ol-popup-closer');
        popupElement.innerHTML = '';
        if (closer) {
          popupElement.appendChild(closer);
        } else {
          const popupCloser = document.createElement('a');
          popupCloser.className = 'ol-popup-closer';
          popupCloser.href = '#';
          popupCloser.innerHTML = '×';
          popupCloser.addEventListener('click', (evt) => {
            evt.preventDefault();
            this.popupOverlay?.setPosition(undefined);
            return false;
          });
          popupElement.appendChild(popupCloser);
        }
        popupElement.appendChild(content);
        this.popupOverlay.setPosition(center);
      }
    }
  }

  volverAlPortal(): void {
    this.router.navigate(['/']);
    console.log('Volviendo al portal...');
  }

  /**
   * Alterna la visibilidad del menú de capas WMS
   */
  toggleWmsMenu(): void {
    this.wmsLayersMenuOpen = !this.wmsLayersMenuOpen;
  }

  /**
   * Alterna la visibilidad de una capa WMS
   */
  toggleWmsLayer(layerConfig: WMSLayerConfig): void {
    const isVisible = this.wmsService.isLayerVisible(layerConfig.name);

    if (isVisible === null) {
      // La capa no existe, agregarla
      this.wmsService.addWmsLayer(
        layerConfig.name,
        layerConfig.url,
        layerConfig.layerName,
        layerConfig.opacity || 1
      );
    } else {
      // La capa existe, alternar visibilidad
      this.wmsService.toggleWmsLayer(layerConfig.name);
    }
  }

  /**
   * Verifica si una capa WMS está visible
   */
  isWmsLayerVisible(layerName: string): boolean {
    const isVisible = this.wmsService.isLayerVisible(layerName);
    return isVisible === true;
  }

  /**
   * Obtiene las capas agrupadas por categoría
   */
  getLayersByCategory(): { [category: string]: WMSLayerConfig[] } {
    const grouped: { [category: string]: WMSLayerConfig[] } = {};
    this.wmsLayersConfig.forEach(layer => {
      const category = layer.category || 'Otros';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(layer);
    });
    return grouped;
  }

  /**
   * Cambia el tipo de mapa base
   */
  changeMapType(mapTypeId: string): void {
    if (!this.map || !this.baseLayer) {
      return;
    }

    this.selectedMapType.set(mapTypeId);
    let newSource;

    switch (mapTypeId) {
      case 'osm':
        newSource = new OSM();
        break;

      case 'satellite':
        // Usar Esri World Imagery (satelital)
        newSource = new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attributions: '© Esri'
        });
        break;

      case 'topo':
        // Usar OpenTopoMap
        newSource = new XYZ({
          url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attributions: '© OpenTopoMap'
        });
        break;

      case 'cartodb':
        // Usar CartoDB Positron
        newSource = new XYZ({
          url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          attributions: '© CartoDB'
        });
        break;

      default:
        newSource = new OSM();
    }

    // Reemplazar la fuente de la capa base
    this.baseLayer.setSource(newSource);
  }

  /**
   * Obtiene el nombre del tipo de mapa actual
   */
  getCurrentMapTypeName(): string {
    const mapType = this.mapTypes.find(mt => mt.id === this.selectedMapType());
    return mapType ? mapType.name : 'OpenStreetMap';
  }

  /**
   * Obtiene el icono del tipo de mapa actual
   */
  getCurrentMapTypeIcon(): string {
    const mapType = this.mapTypes.find(mt => mt.id === this.selectedMapType());
    return mapType ? mapType.icon : 'map';
  }

  /**
   * Alterna la visibilidad del toolbar de tipos de mapa (solo desktop)
   */
  toggleMapTypeToolbar(): void {
    this.mapTypeToolbarHidden.update(hidden => !hidden);
  }

}
