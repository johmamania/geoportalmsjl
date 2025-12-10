import { Component, OnInit, AfterViewInit, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../material/material.module';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import MultiPoint from 'ol/geom/MultiPoint';
import Polygon from 'ol/geom/Polygon';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import LineString from 'ol/geom/LineString';
import { RoutingService } from '../../services/routing.service';
import { GeojsonLayersService, GeoJsonLayer } from '../../services/geojson-layers.service';

interface GeoJsonFeature {
  type: string;
  properties: any;
  geometry: any;
}

@Component({
  selector: 'app-prueba-geojson',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './prueba-geojson.component.html',
  styleUrl: './prueba-geojson.component.css'
})
export class PruebaGeojsonComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: OlMap;
  private layers = new Map<string, VectorLayer<VectorSource>>();
  private popupOverlay?: Overlay;
  private selectedFeature?: Feature;
  private currentLocationMarker?: Feature;
  private routeLayer?: VectorLayer<VectorSource>;
  private currentLocation: { latitude: number; longitude: number } | null = null;
  selectedTransportType = signal<string>('walking');
  selectedTransportName = signal<string>('A Pie');

  // Lista de capas GeoJSON disponibles - Obtenidas del servicio
  geoJsonLayers: GeoJsonLayer[] = [];

  // Lista de features cargadas para mostrar en el panel
  featuresList: Array<{ layerId: string; layerName: string; feature: GeoJsonFeature; icon: string }> = [];
  selectedLayerId = signal<string | null>(null);
  menuOpen = signal<boolean>(false);

  // Tipos de mapas disponibles
  mapTypes = [
    { id: 'osm', name: 'OpenStreetMap', icon: 'map' },
    { id: 'satellite', name: 'Satelital', icon: 'satellite' },
    { id: 'topo', name: 'Topográfico', icon: 'terrain' },
    { id: 'cartodb', name: 'CartoDB Positron', icon: 'layers' }
  ];
  selectedMapType = signal<string>('osm');
  private baseLayer?: TileLayer<any>;

  constructor(
    private http: HttpClient,
    private routingService: RoutingService,
    private geojsonLayersService: GeojsonLayersService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Obtener las capas del servicio
    this.geoJsonLayers = this.geojsonLayersService.getLayers();
  }

  ngOnInit(): void {
    // Obtener el parámetro de la ruta para activar una capa específica
    this.route.params.subscribe(params => {
      const layerId = params['layerId'];
      if (layerId) {
        // Resetear todas las capas primero
        this.geojsonLayersService.resetLayers();
        // Activar la capa seleccionada
        this.geojsonLayersService.activateLayer(layerId);
        // Actualizar la lista local
        this.geoJsonLayers = this.geojsonLayersService.getLayers();

        // Si el mapa ya está inicializado, recargar las capas
        if (this.map) {
          this.reloadVisibleLayers();
        }
      } else {
        // Si no hay parámetro, resetear a estado inicial (solo gps)
        this.geojsonLayersService.resetLayers();
        this.geoJsonLayers = this.geojsonLayersService.getLayers();

        // Si el mapa ya está inicializado, recargar las capas
        if (this.map) {
          this.reloadVisibleLayers();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      // Cargar todas las capas visibles después de inicializar el mapa
      setTimeout(() => {
        this.loadVisibleLayers();
      }, 500);
    }, 300);
  }

  /**
   * Carga todas las capas visibles en el mapa
   */
  private loadVisibleLayers(): void {
    this.geoJsonLayers.forEach(layer => {
      if (layer.visible) {
        this.loadGeoJsonLayer(layer);
      }
    });
  }

  /**
   * Recarga todas las capas visibles (primero elimina todas, luego carga las visibles)
   */
  private reloadVisibleLayers(): void {
    // Eliminar todas las capas existentes
    this.geoJsonLayers.forEach(layer => {
      this.removeGeoJsonLayer(layer.id);
    });

    // Cargar las capas visibles
    setTimeout(() => {
      this.loadVisibleLayers();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  private initMap(): void {
    const mapElement = document.getElementById('geojson-map');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado');
      return;
    }

    const center = fromLonLat([-76.9991, -12.0017]);

    // Crear capa base inicial (OpenStreetMap)
    this.baseLayer = new TileLayer({
      source: new OSM()
    });

    this.map = new OlMap({
      target: 'geojson-map',
      layers: [this.baseLayer],
      view: new View({
        center: center,
        zoom: 13
      })
    });

    setTimeout(() => {
      if (this.map) {
        this.map.updateSize();
      }
    }, 500);

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

    // Crear capa de marcadores (incluyendo ubicación actual)
    const markerLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 1001
    });
    this.map.addLayer(markerLayer);

    // Guardar referencia a la capa de marcadores
    (this.map as any).markerLayer = markerLayer;

    // Crear capa de rutas
    this.routeLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 999,
      style: new Style({
        stroke: new Stroke({
          color: '#3a9b37',
          width: 5
        })
      })
    });
    this.map.addLayer(this.routeLayer);

    // Obtener y marcar ubicación actual del usuario
    this.getCurrentLocation();

    // Interacción de clic en el mapa
    this.map.on('click', (event) => {
      const feature = this.map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature
      );
      if (feature && feature instanceof Feature) {
        // No mostrar popup si es el marcador de ubicación actual
        const properties = feature.getProperties();
        if (properties['name'] === 'Mi Ubicación') {
          return;
        }
        this.showPointOptionsMenu(feature, event.coordinate);
      }
    });

    // Cambiar cursor cuando se pasa sobre un feature
    this.map.on('pointermove', (event) => {
      const feature = this.map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature
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

    window.addEventListener('resize', () => {
      this.map.updateSize();
    });
  }

  toggleLayer(layerId: string): void {
    const layerConfig = this.geoJsonLayers.find(l => l.id === layerId);
    if (!layerConfig) return;

    layerConfig.visible = !layerConfig.visible;

    if (layerConfig.visible) {
      this.loadGeoJsonLayer(layerConfig);
    } else {
      this.removeGeoJsonLayer(layerId);
    }
  }

  private loadGeoJsonLayer(layerConfig: GeoJsonLayer): void {
    const url = `assets/datos/${layerConfig.file}`;

    this.http.get(url, { responseType: 'json' }).subscribe({
      next: (response: any) => {
        // Validar y parsear la respuesta
        let geoJson: any;

        // Si la respuesta es un string, parsearlo
        if (typeof response === 'string') {
          try {
            geoJson = JSON.parse(response);
          } catch (e) {
            console.error(`Error al parsear JSON de ${layerConfig.file}:`, e);
            return;
          }
        } else {
          geoJson = response;
        }

        // Validar que sea un objeto GeoJSON válido
        if (!geoJson || typeof geoJson !== 'object') {
          console.error(`Respuesta inválida de ${layerConfig.file}: no es un objeto`);
          return;
        }

        // Validar que features sea un array
        if (!Array.isArray(geoJson.features)) {
          console.error(`GeoJSON inválido en ${layerConfig.file}: features no es un array`, geoJson);
          // Intentar convertir a array si es un objeto
          if (geoJson.features && typeof geoJson.features === 'object') {
            geoJson.features = Object.values(geoJson.features);
          } else {
            geoJson.features = [];
          }
        }

        const format = new GeoJSON();
        const allFeatures: Feature[] = [];
        const featuresToAdd: Array<{ layerId: string; layerName: string; feature: GeoJsonFeature; icon: string }> = [];

        // Procesar cada feature del GeoJSON
        geoJson.features?.forEach((geoFeature: GeoJsonFeature) => {
          // Validar que el feature tenga la estructura correcta
          if (!geoFeature || !geoFeature.geometry || !geoFeature.geometry.type) {
            console.warn(`Feature inválido en ${layerConfig.file}:`, geoFeature);
            return;
          }

          const geometryType = geoFeature.geometry?.type;

          // Si es MultiPoint, crear un feature por cada punto
          if (geometryType === 'MultiPoint') {
            const coordinates = geoFeature.geometry.coordinates;

            // Validar que coordinates sea un array
            if (!Array.isArray(coordinates)) {
              console.error(`Coordinates no es un array en ${layerConfig.file}:`, coordinates);
              return;
            }

            coordinates.forEach((coord: number[], index: number) => {
              // Validar que coord sea un array válido con al menos 2 elementos
              if (!Array.isArray(coord) || coord.length < 2) {
                console.warn(`Coordenada inválida en ${layerConfig.file}, índice ${index}:`, coord);
                return;
              }
              // Crear un nuevo feature para cada punto
              const pointFeature = new Feature({
                geometry: new Point(fromLonLat(coord)),
                ...geoFeature.properties,
                originalIndex: index
              });
              allFeatures.push(pointFeature);

              // Agregar a la lista con nombre único
              featuresToAdd.push({
                layerId: layerConfig.id,
                layerName: layerConfig.name,
                feature: {
                  type: 'Feature',
                  properties: {
                    ...geoFeature.properties,
                    pointIndex: index + 1,
                    totalPoints: coordinates.length
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: coord
                  }
                },
                icon: layerConfig.icon
              });
            });
          } else {
            // Para otros tipos de geometría, usar el feature directamente
            try {
              // Validar que el feature tenga coordenadas válidas
              if (!geoFeature.geometry || !geoFeature.geometry.coordinates) {
                console.warn(`Feature sin coordenadas válidas en ${layerConfig.file}:`, geoFeature);
                return;
              }

              const feature = format.readFeature(geoFeature, {
                featureProjection: 'EPSG:3857'
              });

              if (feature) {
                allFeatures.push(feature);

                featuresToAdd.push({
                  layerId: layerConfig.id,
                  layerName: layerConfig.name,
                  feature: geoFeature,
                  icon: layerConfig.icon
                });
              }
            } catch (error) {
              console.error(`Error al leer feature de ${layerConfig.file}:`, error, geoFeature);
            }
          }
        });

        // Crear capa vectorial
        const vectorSource = new VectorSource({
          features: allFeatures
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: (feature) => {
            if (feature instanceof Feature) {
              return this.getStyleForFeature(feature, layerConfig.icon);
            }
            return new Style({});
          },
          zIndex: 1000
        });

        this.map.addLayer(vectorLayer);
        this.layers.set(layerConfig.id, vectorLayer);

        // Agregar features a la lista
        this.featuresList.push(...featuresToAdd);

        // Ajustar vista para mostrar todas las features
        if (allFeatures.length > 0) {
          const extent = vectorSource.getExtent();
          this.map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000
          });
        }
      },
      error: (error) => {
        console.error(`Error al cargar ${layerConfig.file}:`, error);
      }
    });
  }

  private removeGeoJsonLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      this.map.removeLayer(layer);
      this.layers.delete(layerId);
    }

    // Remover features de la lista
    this.featuresList = this.featuresList.filter(f => f.layerId !== layerId);
  }

  private getStyleForFeature(feature: Feature, iconUrl: string): Style {
    const geometry = feature.getGeometry();

    // Scale fijo para garantizar exactamente 15x15px
    // Asumiendo que los iconos originales son de aproximadamente 32px
    // 15 / 32 = 0.46875
    const ICON_SIZE_PX = 15;
    const ORIGINAL_ICON_SIZE = 32; // Tamaño típico de los iconos PNG
    const iconScale = ICON_SIZE_PX / ORIGINAL_ICON_SIZE; // 0.46875

    if (geometry instanceof Point) {
      return new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          src: iconUrl,
          scale: iconScale // Escala fija para obtener exactamente 15x15px
        })
      });
    } else if (geometry instanceof MultiPoint) {
      return new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          src: iconUrl,
          scale: iconScale // Escala fija para obtener exactamente 15x15px
        })
      });
    } else if (geometry instanceof Polygon) {
      return new Style({
        fill: new Fill({
          color: 'rgba(76, 175, 80, 0.2)'
        }),
        stroke: new Stroke({
          color: '#4CAF50',
          width: 2
        })
      });
    }

    return new Style({});
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

        // Estilo para el marcador de ubicación actual usando icono rojo
        this.currentLocationMarker.setStyle(new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            src: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            scale: 0.3, // Ajustar para que el icono sea de 15x15px (el icono original es ~50px, 15/50 = 0.3)
            opacity: 1
          })
        }));

        // Agregar el marcador a la capa de marcadores
        const markerLayer = (this.map as any).markerLayer as VectorLayer<VectorSource>;

        if (markerLayer) {
          markerLayer.getSource()?.addFeature(this.currentLocationMarker);
        }

        console.log('Ubicación actual marcada:', { latitude, longitude });
      },
      (error) => {
        console.warn('Error al obtener la ubicación:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  /**
   * Muestra un menú de opciones cuando se hace clic en un punto
   */
  private showPointOptionsMenu(feature: Feature, coordinate: number[]): void {
    if (!this.popupOverlay) return;

    const popupElement = this.popupOverlay.getElement();
    if (!popupElement) return;

    const properties = feature.getProperties();
    const name = properties['Name'] || properties['name'] || 'Sin nombre';

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
      <div style="font-weight: bold; font-size: 18px; margin-bottom: 20px; color: #1e3c72; text-align: center;">${name}</div>
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
    this.popupOverlay.setPosition(coordinate);
    this.selectedFeature = feature;

    // Event listeners para los botones
    setTimeout(() => {
      const btnVerInfo = document.getElementById('btn-ver-info');
      const btnComoLlegar = document.getElementById('btn-como-llegar');

      if (btnVerInfo) {
        btnVerInfo.addEventListener('click', () => {
          this.showPointInfo(feature, coordinate);
        });
      }

      if (btnComoLlegar) {
        btnComoLlegar.addEventListener('click', () => {
          this.showRouteOptions(feature, coordinate);
        });
      }
    }, 100);
  }

  /**
   * Muestra un popup con información del punto
   */
  private showPointInfo(feature: Feature, coordinate: number[]): void {
    if (!this.popupOverlay) return;

    const popupElement = this.popupOverlay.getElement();
    if (!popupElement) return;

    const properties = feature.getProperties();
    const name = properties['Name'] || properties['name'] || 'Sin nombre';
    const description = properties['description'] || '';

    popupElement.style.background = '#ffffff';
    popupElement.style.borderRadius = '8px';
    popupElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    popupElement.style.minWidth = '250px';
    popupElement.style.maxWidth = '350px';
    popupElement.style.position = 'relative';

    const content = document.createElement('div');
    content.style.padding = '16px';
    content.style.paddingTop = '40px';

    // Extraer información de la descripción HTML si existe
    let cleanDescription = description;
    if (description && description.includes('<html')) {
      // Intentar extraer texto de la descripción HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = description;
      cleanDescription = tempDiv.textContent || tempDiv.innerText || '';
    }

    content.innerHTML = `
      <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #1e3c72;">${name}</div>
      ${cleanDescription ? `<div style="color: #666; margin-bottom: 10px; line-height: 1.5; max-height: 300px; overflow-y: auto;">${cleanDescription.substring(0, 500)}${cleanDescription.length > 500 ? '...' : ''}</div>` : ''}
      <div style="color: #999; font-size: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
        <strong>Coordenadas:</strong><br>
        ${this.getFeatureCoordinates(feature)}
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
    this.popupOverlay.setPosition(coordinate);
  }

  /**
   * Muestra opciones de transporte y calcula la ruta
   */
  private showRouteOptions(feature: Feature, coordinate: number[]): void {
    if (!this.currentLocation) {
      alert('Ubicación no disponible. Por favor, permite el acceso a la ubicación.');
      this.popupOverlay?.setPosition(undefined);
      return;
    }

    if (!this.popupOverlay) return;

    const popupElement = this.popupOverlay.getElement();
    if (!popupElement) return;

    const properties = feature.getProperties();
    const name = properties['Name'] || properties['name'] || 'Sin nombre';

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
      <div style="font-weight: bold; font-size: 18px; margin-bottom: 16px; color: #1e3c72; text-align: center;">Cómo Llegar a ${name}</div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">Selecciona el medio de transporte:</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button id="transport-walking" class="transport-btn active" data-transport="walking" data-name="A Pie" data-profile="walking" style="padding: 10px; background: #4A90E2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
            🚶 A Pie
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
    this.popupOverlay.setPosition(coordinate);

    // Event listeners para los botones de transporte
    setTimeout(() => {
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

          if (transportProfile === 'cycling') {
            this.selectedTransportType.set('cycling');
          } else if (transportProfile === 'driving') {
            this.selectedTransportType.set('driving');
          } else {
            this.selectedTransportType.set('walking');
          }

          this.selectedTransportName.set(transportName);
          this.clearRoute();
          setTimeout(() => {
            this.calculateRoute(feature);
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
      this.calculateRoute(feature);
    }, 100);
  }

  /**
   * Calcula la ruta usando el servicio de routing
   */
  private calculateRoute(destination: Feature): void {
    if (!this.currentLocation || !this.routeLayer) {
      return;
    }

    const transport = this.selectedTransportType();
    let profile: 'driving' | 'walking' | 'cycling' = 'walking';

    if (transport === 'cycling') {
      profile = 'cycling';
    } else if (transport === 'driving') {
      profile = 'driving';
    } else {
      profile = 'walking';
    }

    this.clearRoute();

    const routeInfo = document.getElementById('route-info');
    if (routeInfo) {
      routeInfo.textContent = 'Calculando ruta...';
      routeInfo.style.color = '#333';
    }

    // Obtener coordenadas del destino
    const geometry = destination.getGeometry();
    if (!geometry || !(geometry instanceof Point)) {
      return;
    }

    const destCoords = geometry.getCoordinates();

    // Convertir de EPSG:3857 a lon/lat usando toLonLat
    const destLonLat = toLonLat(destCoords);

    const origin: [number, number] = [this.currentLocation.longitude, this.currentLocation.latitude];
    const dest: [number, number] = [destLonLat[0], destLonLat[1]];

    this.routingService.getRoute(origin, dest, profile).subscribe({
      next: (response) => {
        const route = response.routes[0];
        const geometry = route.geometry;

        const coordinates = geometry.coordinates.map((coord: [number, number]) =>
          fromLonLat([coord[0], coord[1]])
        );

        const routeFeature = new Feature({
          geometry: new LineString(coordinates)
        });

        routeFeature.setStyle(new Style({
          stroke: new Stroke({
            color: '#3a9b37',
            width: 5,
            lineDash: []
          })
        }));

        this.routeLayer?.getSource()?.addFeature(routeFeature);

        const distance = route.distance;
        const duration = route.duration;

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

        const transportName = this.selectedTransportName();

        if (routeInfo) {
          routeInfo.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">${transportName}</div>
            <div style="font-size: 14px;">Distancia: ${distanceText}</div>
            <div style="font-size: 14px;">Tiempo estimado: ${durationText}</div>
          `;
        }

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
   * Limpia la ruta del mapa
   */
  private clearRoute(): void {
    if (this.routeLayer) {
      this.routeLayer.getSource()?.clear();
    }
  }

  /**
   * Obtiene las coordenadas del feature
   */
  private getFeatureCoordinates(feature: Feature): string {
    const geometry = feature.getGeometry();
    if (geometry instanceof Point) {
      const coords = geometry.getCoordinates();
      // Convertir de EPSG:3857 a lon/lat usando toLonLat
      const lonLat = toLonLat(coords);
      return `Lat: ${lonLat[1].toFixed(6)}, Lng: ${lonLat[0].toFixed(6)}`;
    }
    return 'N/A';
  }

  locateFeatureInList(feature: Feature): void {
    // Buscar el feature en la lista y hacer scroll
    const properties = feature.getProperties();
    const name = properties['Name'] || properties['name'] || 'Sin nombre';

    // Aquí podrías implementar lógica para resaltar el elemento en la lista
    console.log('Ubicando feature en lista:', name);
    this.popupOverlay?.setPosition(undefined);
  }

  locateOnMap(featureItem: { layerId: string; layerName: string; feature: GeoJsonFeature; icon: string }): void {
    const layer = this.layers.get(featureItem.layerId);
    if (!layer) return;

    try {
      const format = new GeoJSON();

      // Validar que el feature tenga la estructura correcta
      if (!featureItem.feature || !featureItem.feature.geometry) {
        console.warn('Feature inválido para centrar:', featureItem.feature);
        return;
      }

      const olFeature = format.readFeature(featureItem.feature, {
        featureProjection: 'EPSG:3857'
      });

      if (!olFeature) {
        console.warn('No se pudo leer el feature para centrar:', featureItem.feature);
        return;
      }

      const geometry = olFeature.getGeometry();
    if (geometry) {
      let center: number[] | undefined;

      if (geometry instanceof Point) {
        center = geometry.getCoordinates();
      } else if (geometry instanceof MultiPoint) {
        const coordinates = geometry.getCoordinates();
        center = coordinates[0]; // Usar el primer punto
      } else {
        // Para Polygon u otros tipos, usar el centro del extent
        const extent = geometry.getExtent();
        center = [
          (extent[0] + extent[2]) / 2,
          (extent[1] + extent[3]) / 2
        ];
      }

      if (center) {
        // Ajustar vista
        this.map.getView().animate({
          center: center,
          zoom: this.map.getView().getZoom() || 15,
          duration: 1000
        });

        // Mostrar popup después de la animación
        setTimeout(() => {
          this.showPointOptionsMenu(olFeature, center!);
        }, 1000);
      }
    }
    } catch (error) {
      console.error('Error al centrar feature:', error, featureItem.feature);
    }
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  isLayerVisible(layerId: string): boolean {
    const layer = this.geoJsonLayers.find(l => l.id === layerId);
    return layer?.visible || false;
  }

  getFeaturesByLayer(layerId: string): Array<{ layerId: string; layerName: string; feature: GeoJsonFeature; icon: string }> {
    return this.featuresList.filter(f => f.layerId === layerId);
  }

  getLayerName(layerId: string): string {
    const layer = this.geoJsonLayers.find(l => l.id === layerId);
    return layer?.name || layerId;
  }

  getFeatureName(feature: GeoJsonFeature): string {
    const name = feature.properties?.Name || feature.properties?.name;
    if (name) {
      // Si es un punto de MultiPoint, agregar el índice
      if (feature.properties?.pointIndex) {
        return `${name} - Punto ${feature.properties.pointIndex}`;
      }
      return name;
    }
    return 'Sin nombre';
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
}

