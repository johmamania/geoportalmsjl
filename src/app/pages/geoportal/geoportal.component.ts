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
