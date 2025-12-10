import { Injectable } from '@angular/core';

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
  // Lista de capas GeoJSON disponibles
  private layers: GeoJsonLayer[] = [
    { id: 'gps', name: 'Límite SJL', file: 'sjl_limite.geojson', icon: 'assets/icons/gps.png', visible: true },
    { id: 'acv', name: 'ACV Baja', file: 'acv_baja.geojson', icon: 'assets/icons/acv.png', visible: false },
    { id: 'agua', name: 'Abastecimiento de Agua', file: 'abastecimiento_agua.geojson', icon: 'assets/icons/agua.png', visible: false },
    { id: 'albergue', name: 'Albergues', file: 'albergues.geojson', icon: 'assets/icons/albergue.png', visible: false },
    { id: 'hidrante', name: 'Hidrantes', file: 'hidrantes.geojson', icon: 'assets/icons/hidrante.png', visible: false },
    { id: 'reunion', name: 'Puntos de Reunión', file: 'puntos_reunion.geojson', icon: 'assets/icons/reunion.png', visible: false },
  ];

  /**
   * Obtiene todas las capas GeoJSON
   */
  getLayers(): GeoJsonLayer[] {
    return this.layers;
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

