import { Component, AfterViewInit, OnDestroy, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material.module';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Icon, Circle, Fill, Stroke } from 'ol/style';

export interface MapSelectorData {
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-map-selector-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="map-selector-dialog">
      <div class="dialog-header">
        <h2>Seleccionar Ubicación en el Mapa</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <div class="dialog-content">
        <div class="instructions">
          <p>Haz clic en el mapa para seleccionar la ubicación</p>
        </div>
        <div id="map-selector" class="map-container"></div>
        <div class="coordinates-display" *ngIf="selectedLatitude && selectedLongitude">
          <p><strong>Coordenadas seleccionadas:</strong></p>
          <p>Latitud: {{ selectedLatitude | number:'1.6-6' }}</p>
          <p>Longitud: {{ selectedLongitude | number:'1.6-6' }}</p>
        </div>
      </div>
      
      <div class="dialog-actions">
        <button mat-button (click)="close()">Cancelar</button>
        <button mat-raised-button 
                color="primary" 
                (click)="accept()"
                [disabled]="!selectedLatitude || !selectedLongitude">
          Aceptar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .map-selector-dialog {
      display: flex;
      flex-direction: column;
      width: 90vw;
      max-width: 900px;
      max-height: 90vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      color: #1e3c72;
    }

    .dialog-content {
      flex: 1;
      padding: 16px 24px;
      overflow: auto;
    }

    .instructions {
      margin-bottom: 16px;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 4px;
    }

    .instructions p {
      margin: 0;
      color: #1976d2;
      font-size: 14px;
    }

    .map-container {
      width: 100%;
      height: 500px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .coordinates-display {
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .coordinates-display p {
      margin: 4px 0;
      font-size: 14px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class MapSelectorDialogComponent implements AfterViewInit, OnDestroy {
  private map!: Map;
  private markerLayer!: VectorLayer<VectorSource>;
  private markerFeature?: Feature;
  
  selectedLatitude?: number;
  selectedLongitude?: number;

  constructor(
    public dialogRef: MatDialogRef<MapSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MapSelectorData
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }
  }

  private initMap(): void {
    const mapElement = document.getElementById('map-selector');
    if (!mapElement) {
      console.error('Elemento del mapa no encontrado');
      return;
    }

    // Coordenadas iniciales (San Juan de Lurigancho o las proporcionadas)
    const initialLon = this.data.longitude || -76.9991;
    const initialLat = this.data.latitude || -12.0017;
    const center = fromLonLat([initialLon, initialLat]);

    // Crear capa base
    const baseLayer = new TileLayer({
      source: new OSM()
    });

    // Crear capa de marcador
    const markerSource = new VectorSource();
    this.markerLayer = new VectorLayer({
      source: markerSource,
      style: new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#FF0000' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2 })
        })
      })
    });

    // Crear mapa
    this.map = new Map({
      target: 'map-selector',
      layers: [baseLayer, this.markerLayer],
      view: new View({
        center: center,
        zoom: 13
      })
    });

    // Si hay coordenadas iniciales, mostrar marcador
    if (this.data.latitude && this.data.longitude) {
      this.setMarker(initialLat, initialLon);
      this.selectedLatitude = initialLat;
      this.selectedLongitude = initialLon;
    }

    // Agregar evento de clic al mapa
    this.map.on('click', (event) => {
      const coordinate = event.coordinate;
      const lonLat = toLonLat(coordinate);
      this.selectedLongitude = lonLat[0];
      this.selectedLatitude = lonLat[1];
      this.setMarker(this.selectedLatitude, this.selectedLongitude);
    });

    // Ajustar tamaño del mapa
    setTimeout(() => {
      this.map.updateSize();
    }, 200);
  }

  private setMarker(lat: number, lon: number): void {
    const coordinate = fromLonLat([lon, lat]);
    
    // Eliminar marcador anterior
    if (this.markerFeature) {
      this.markerLayer.getSource()?.removeFeature(this.markerFeature);
    }

    // Crear nuevo marcador
    this.markerFeature = new Feature({
      geometry: new Point(coordinate)
    });

    this.markerLayer.getSource()?.addFeature(this.markerFeature);
  }

  accept(): void {
    if (this.selectedLatitude && this.selectedLongitude) {
      this.dialogRef.close({
        latitude: this.selectedLatitude,
        longitude: this.selectedLongitude
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

