import { Injectable } from '@angular/core';
import OlMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { WMSLayerInfo } from '../model/wms-layer-info';

@Injectable({
  providedIn: 'root'
})
export class WmsService {
  private wmsLayers: Map<string, TileLayer<TileWMS>> = new Map<string, TileLayer<TileWMS>>();
  private map?: OlMap;

  /**
   * Inicializa el servicio con la instancia del mapa
   */
  initialize(map: OlMap): void {
    this.map = map;
  }

  /**
   * Agrega una capa WMS al mapa
   * @param name Nombre único de la capa
   * @param url URL del servidor WMS
   * @param layerName Nombre de la capa en el servidor WMS
   * @param opacity Opacidad de la capa (0-1)
   * @returns true si se agregó correctamente, false en caso contrario
   */
  addWmsLayer(name: string, url: string, layerName: string, opacity: number = 1): boolean {
    if (!this.map) {
      console.error('Mapa no inicializado. Llame a initialize() primero.');
      return false;
    }

    // Verificar si la capa ya existe
    if (this.wmsLayers.has(name)) {
      console.warn(`La capa WMS "${name}" ya existe. Use toggleWmsLayer() para activarla/desactivarla.`);
      return false;
    }

    try {
      // Crear la fuente WMS con configuración para alta resolución
      const wmsSource = new TileWMS({
        url: url,
        params: {
          'LAYERS': layerName,
          'TILED': true,
          'VERSION': '1.1.0',
          'FORMAT': 'image/png',
          'TRANSPARENT': true
        },
        serverType: 'geoserver',
        transition: 0
      });

      // Crear la capa con transparencia
      const wmsLayer = new TileLayer({
        source: wmsSource,
        opacity: opacity,
        visible: true,
        zIndex: 100 // Por encima de la capa base pero debajo de las capas vectoriales
      });

      // Agregar la capa al mapa
      this.map.addLayer(wmsLayer);
      this.wmsLayers.set(name, wmsLayer);

      console.log(`Capa WMS "${name}" agregada correctamente.`);
      return true;
    } catch (error) {
      console.error(`Error al agregar la capa WMS "${name}":`, error);
      return false;
    }
  }

  /**
   * Elimina una capa WMS del mapa
   * @param name Nombre de la capa a eliminar
   * @returns true si se eliminó correctamente, false en caso contrario
   */
  removeWmsLayer(name: string): boolean {
    if (!this.map) {
      console.error('Mapa no inicializado.');
      return false;
    }

    const layer = this.wmsLayers.get(name);
    if (!layer) {
      console.warn(`La capa WMS "${name}" no existe.`);
      return false;
    }

    try {
      this.map.removeLayer(layer);
      this.wmsLayers.delete(name);
      console.log(`Capa WMS "${name}" eliminada correctamente.`);
      return true;
    } catch (error) {
      console.error(`Error al eliminar la capa WMS "${name}":`, error);
      return false;
    }
  }

  /**
   * Alterna la visibilidad de una capa WMS
   * @param name Nombre de la capa
   * @returns true si la capa está visible después de la operación, null si la capa no existe
   */
  toggleWmsLayer(name: string): boolean | null {
    if (!this.map) {
      console.error('Mapa no inicializado.');
      return null;
    }

    const layer = this.wmsLayers.get(name);
    if (!layer) {
      console.warn(`La capa WMS "${name}" no existe.`);
      return null;
    }

    const currentVisibility = layer.getVisible();
    layer.setVisible(!currentVisibility);
    return !currentVisibility;
  }

  /**
   * Obtiene el estado de visibilidad de una capa
   * @param name Nombre de la capa
   * @returns true si está visible, false si no, null si no existe
   */
  isLayerVisible(name: string): boolean | null {
    const layer = this.wmsLayers.get(name);
    if (!layer) {
      return null;
    }
    return layer.getVisible();
  }

  /**
   * Obtiene todas las capas WMS registradas
   * @returns Array con información de las capas
   */
  getAllLayers(): WMSLayerInfo[] {
    const layers: WMSLayerInfo[] = [];
    this.wmsLayers.forEach((layer, name) => {
      layers.push({
        name: name,
        visible: layer.getVisible(),
        opacity: layer.getOpacity()
      });
    });
    return layers;
  }

  /**
   * Establece la opacidad de una capa
   * @param name Nombre de la capa
   * @param opacity Opacidad (0-1)
   */
  setLayerOpacity(name: string, opacity: number): boolean {
    const layer = this.wmsLayers.get(name);
    if (!layer) {
      console.warn(`La capa WMS "${name}" no existe.`);
      return false;
    }

    layer.setOpacity(Math.max(0, Math.min(1, opacity)));
    return true;
  }

  /**
   * Limpia todas las capas WMS
   */
  clearAllLayers(): void {
    if (!this.map) {
      return;
    }

    this.wmsLayers.forEach((layer) => {
      this.map!.removeLayer(layer);
    });
    this.wmsLayers.clear();
  }
}

