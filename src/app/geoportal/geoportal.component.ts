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
import { Style, Icon } from 'ol/style';
import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { MaterialModule } from '../material/material.module';
import { EventType, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { WmsService } from '../services/wms.service';
import { WMSLayerConfig } from '../model/wms-layer-info';
import { KeyValuePipe } from '@angular/common';
import { MapDataService } from '../services/map-data.service';
import { MapPoint } from '../model/map-point';
import BaseEvent from 'ol/events/Event';
import { EventTypes } from 'ol/Observable';


@Component({
  selector: 'app-geoportal',
  standalone: true,
  imports: [MaterialModule, RouterOutlet, KeyValuePipe],
  templateUrl: './geoportal.component.html',
  styleUrl: './geoportal.component.css'
})
export class GeoportalComponent implements AfterViewInit, OnDestroy {
  private map!: Map;
  private marcadorLayer?: VectorLayer<VectorSource>;
  private currentLocationMarker?: Feature;
  private popupOverlay?: Overlay;
  private baseLayer?: TileLayer<any>;
  version: string;
  wmsLayersMenuOpen: boolean = false;
  selectedMapType = signal<string>('osm');
  showLegend = signal<boolean>(false);

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
    private wmsService: WmsService,
    private mapDataService: MapDataService
  ) {
    this.version = environment.VERSION;
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
            this.showPointPopup(point, coordinates);
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
   * Carga puntos desde Supabase y los muestra en el mapa
   */
  private loadPointsFromSupabase(): void {
    // Suscribirse a los puntos del servicio
    this.mapDataService.getPoints().subscribe(points => {
    //  console.log("ubicaciones" + points);
      this.renderPointsOnMap(points);
    });
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
   * Muestra un popup con información del punto
   */
  private showPointPopup(point: MapPoint, position: number[]): void {
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
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #1e3c72;">${point.name}</div>
        ${point.description ? `<div style="color: #666; margin-bottom: 10px; line-height: 1.5;">${point.description}</div>` : ''}
        ${point.category ? `<div style="color: #999; font-size: 13px; margin-bottom: 8px;"><strong>Categoría:</strong> ${point.category}</div>` : ''}
        <div style="color: #999; font-size: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <strong>Coordenadas:</strong><br>
          Lat: ${point.latitude.toFixed(6)}, Lng: ${point.longitude.toFixed(6)}
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

      // Estilos del botón cerrar (arriba a la derecha)
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

      // Hover del botón cerrar
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

  iniciarSesion(): void {
    this.router.navigate(['/admin/login']);
    console.log('Iniciando sesión...');
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

}
