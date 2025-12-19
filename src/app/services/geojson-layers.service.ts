import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { GeojsonNombresService } from './geojson-nombres.service';

export interface GeoJsonLayer {
  id: string;
  name: string;
  file: string;
  icon: string;
  visible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeojsonLayersService {
  private layers: GeoJsonLayer[] = [];
  private layersLoaded = false;

  constructor(private geojsonNombresService: GeojsonNombresService) {
    // Capa especial que siempre debe estar presente (Límite SJL)
    const gpsLayer: GeoJsonLayer = {
      id: 'gps',
      name: 'Límite SJL',
      file: 'sjl_limite.geojson',
      icon: 'assets/icons/gps.png',
      visible: true
    };
    this.layers = [gpsLayer];
  }

  /**
   * Obtiene el icono basado en el nombre del archivo
   */
  private getIconByFileName(fileName: string): string {
    // Remover extensión .geojson
    const nameWithoutExt = fileName.replace('.geojson', '').toLowerCase();

    // Mapeo de nombres de archivo a iconos (ordenados por especificidad: más específicos primero)
    const iconMap: { [key: string]: string } = {
      'sjl_limite': 'assets/icons/gps.png',
      'acv_baja': 'assets/icons/acv.png',
      'abastecimiento_agua': 'assets/icons/agua.png',
      'puntos_reunion': 'assets/icons/reunion.png',
      'albergues': 'assets/icons/albergue.png',
      'hidrantes': 'assets/icons/hidrante.png',
      'agua': 'assets/icons/agua.png',
      'albergue': 'assets/icons/albergue.png',
      'hidrante': 'assets/icons/hidrante.png',
      'reunion': 'assets/icons/reunion.png',
    };

    // 1. Buscar coincidencia exacta primero
    if (iconMap[nameWithoutExt]) {
      return iconMap[nameWithoutExt];
    }

    // 2. Buscar coincidencia parcial, priorizando las claves más largas (más específicas)
    // Ordenar las claves por longitud descendente para que coincidencias más específicas tengan prioridad
    const sortedKeys = Object.keys(iconMap).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      // Solo buscar si el nombre del archivo contiene la clave completa
      // Esto evita que "reunion" coincida con archivos que contienen "abastecimiento_agua"
      if (nameWithoutExt.includes(key)) {
        return iconMap[key];
      }
    }

    // Icono por defecto (usar gps como fallback)
    return 'assets/icons/gps.png';
  }

  /**
   * Genera un ID único basado en el nombre del archivo
   */
  private generateIdFromFileName(fileName: string): string {
    return fileName.replace('.geojson', '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  /**
   * Carga las capas desde Supabase
   */
  loadLayersFromSupabase(): Observable<GeoJsonLayer[]> {
    if (this.layersLoaded) {
      return of(this.layers);
    }

    return this.geojsonNombresService.getNombres().pipe(
      map(nombres => {
        // Mantener la capa GPS siempre presente
        const gpsLayer = this.layers.find(l => l.id === 'gps');
        this.layers = gpsLayer ? [gpsLayer] : [];

        // Agregar capas desde Supabase (excluyendo sjl_limite.geojson que ya está como 'gps')
        nombres.forEach(nombre => {
          // No agregar si es el límite SJL (ya está como 'gps')
          if (nombre.archivo !== 'sjl_limite.geojson') {
            const layer: GeoJsonLayer = {
              id: this.generateIdFromFileName(nombre.archivo),
              name: nombre.nombre,
              file: nombre.archivo,
              icon: this.getIconByFileName(nombre.archivo),
              visible: false
            };
            this.layers.push(layer);
          }
        });

        this.layersLoaded = true;
        return this.layers;
      })
    );
  }

  /**
   * Obtiene todas las capas GeoJSON (carga desde Supabase si no están cargadas)
   */
  getLayers(): GeoJsonLayer[] {
    if (!this.layersLoaded) {
      // Cargar de forma síncrona si es posible, o retornar las capas actuales
      this.loadLayersFromSupabase().subscribe();
    }
    return this.layers;
  }

  /**
   * Obtiene todas las capas como Observable (carga desde Supabase)
   */
  getLayersObservable(): Observable<GeoJsonLayer[]> {
    return this.loadLayersFromSupabase();
  }

  /**
   * Recarga las capas desde Supabase
   */
  reloadLayers(): Observable<GeoJsonLayer[]> {
    this.layersLoaded = false;
    return this.loadLayersFromSupabase();
  }

  /**
   * Obtiene una capa por su ID
   */
  getLayerById(id: string): GeoJsonLayer | undefined {
    return this.layers.find(layer => layer.id === id);
  }

  /**
   * Resetea todas las capas a su estado inicial (solo gps visible)
   */
  resetLayers(): void {
    this.layers.forEach(layer => {
      layer.visible = layer.id === 'gps';
    });
  }

  /**
   * Activa una capa específica
   */
  activateLayer(id: string): void {
    const layer = this.getLayerById(id);
    if (layer) {
      layer.visible = true;
    }
  }

  /**
   * Desactiva una capa específica
   */
  deactivateLayer(id: string): void {
    const layer = this.getLayerById(id);
    if (layer) {
      layer.visible = false;
    }
  }
}

