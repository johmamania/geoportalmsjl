import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material/material.module';
import { MapDataService } from '../../services/map-data.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { CategoriasService, Categoria } from '../../services/categorias.service';
import { MapPoint, MapPointCreate } from '../../model/map-point';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MapSelectorDialogComponent, MapSelectorData } from './map-selector-dialog.component';
import { GeojsonLayersService, GeoJsonLayer } from '../../services/geojson-layers.service';
import { GeojsonService } from '../../services/geojson.service';
import { GeojsonNombresService } from '../../services/geojson-nombres.service';
import { SubirGeojsonComponent, SubirGeojsonData } from './subir-geojson/subir-geojson.component';
import { SupabaseService } from '../../core/supabase.service';
import { from } from 'rxjs';

import Swal from 'sweetalert2';
import { VisitsComponent } from './visits/visits.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AdminPublicacionesComponent } from './admin-publicaciones/admin-publicaciones.component';
import { AdminCursosComponent } from './admin-cursos/admin-cursos.component';

// OpenLayers imports
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import type { FeatureLike } from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import { Modify } from 'ol/interaction';
import { Draw } from 'ol/interaction';
import Overlay from 'ol/Overlay';


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    VisitsComponent,
    DashboardComponent,
    AdminPublicacionesComponent,
    AdminCursosComponent
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['name', 'description', 'latitude', 'longitude', 'category', 'created_at', 'actions'];
  dataSource = new MatTableDataSource<MapPoint>([]);
  allPoints: MapPoint[] = []; // Almacenar todos los puntos para filtrar

  pointForm: FormGroup;
  isEditMode = signal(false);
  editingPointId = signal<string | null>(null);
  isLoading = signal(false);
  showModal = signal(false);
  searchTerm: string = '';

  // Paginación
  pageSize = signal(7);
  pageIndex = signal(0);
  totalItems = signal(0);
  pageSizeOptions = [7, 10, 25, 50,70,100,150,200,300];
  categorias: Categoria[] = [];

  // GeoJSON Editor
  geojsonLayers: GeoJsonLayer[] = [];
  selectedLayer = signal<GeoJsonLayer | null>(null);
  private geojsonMap?: OlMap;
  private geojsonVectorSource?: VectorSource;
  private geojsonVectorLayer?: VectorLayer<VectorSource>;
  private modifyInteraction?: Modify;
  private drawInteraction?: Draw;
  private popupOverlay?: Overlay;
  private currentLayerIcon?: string; // Icono de la capa actual
  selectedFeature = signal<Feature | null>(null);
  isAddMode = signal(false);
  isMoveMode = signal(false);
  featureCount = signal(0);
  isSavingGeojson = signal(false);
  featuresList: Feature[] = [];
  showUbicacionesList = signal(false);

  constructor(
    private fb: FormBuilder,
    private mapDataService: MapDataService,
    private authService: AdminAuthService,
    private categoriasService: CategoriasService,
    private dialog: MatDialog,
    private router: Router,
    private geojsonLayersService: GeojsonLayersService,
    private geojsonService: GeojsonService,
    private geojsonNombresService: GeojsonNombresService,
    private supabaseService: SupabaseService
  ) {
    this.pointForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]],
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]],
      icon_type: ['default'],
      icon_color: ['#FF0000'],
      category: ['']
    });
  }

  ngOnInit(): void {
    this.categorias = this.categoriasService.getCategorias();
    //this.loadPoints();
    //this.mapDataService.getPoints().subscribe(points => {
    //  this.updateDataSource(points);
    //});

    // Cargar capas GeoJSON desde Supabase
    this.geojsonLayersService.getLayersObservable().subscribe({
      next: (layers) => {
        // Filtrar la capa "gps" (Límite SJL) de la lista visible
        this.geojsonLayers = layers.filter(layer => layer.id !== 'gps');

        // Cargar automáticamente el límite SJL en el mapa
        const gpsLayer = layers.find(l => l.id === 'gps');
        if (gpsLayer) {
          // Inicializar mapa y cargar el límite SJL
          setTimeout(() => {
            this.initGeojsonMap();
            this.loadGeojsonForEditing(gpsLayer);
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error al cargar capas desde Supabase:', error);
        // Usar capas por defecto si hay error
        const allLayers = this.geojsonLayersService.getLayers();
        this.geojsonLayers = allLayers.filter(layer => layer.id !== 'gps');

        // Cargar límite SJL si existe
        const gpsLayer = allLayers.find(l => l.id === 'gps');
        if (gpsLayer) {
          setTimeout(() => {
            this.initGeojsonMap();
            this.loadGeojsonForEditing(gpsLayer);
          }, 100);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }



  updateDataSource(points: MapPoint[]): void {
    this.allPoints = points; // Guardar todos los puntos
    this.applyFilter(); // Aplicar filtro si existe
  }

  applyFilter(): void {
    let filteredPoints = [...this.allPoints];

    // Aplicar filtro de búsqueda si existe
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filteredPoints = this.allPoints.filter(point => {
        const nameMatch = point.name?.toLowerCase().includes(searchLower) || false;
        const categoryMatch = point.category?.toLowerCase().includes(searchLower) || false;
        const descriptionMatch = point.description?.toLowerCase().includes(searchLower) || false;
        return nameMatch || categoryMatch || descriptionMatch;
      });
    }

    // Actualizar total de items
    this.totalItems.set(filteredPoints.length);

    // Aplicar paginación
    const startIndex = this.pageIndex() * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    this.dataSource.data = filteredPoints.slice(startIndex, endIndex);

    // Resetear a la primera página si no hay resultados en la página actual
    if (this.dataSource.data.length === 0 && this.pageIndex() > 0) {
      this.pageIndex.set(0);
      this.applyFilter();
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.applyFilter(); // Aplicar filtro con nueva paginación
  }

  openAddDialog(): void {
    this.isEditMode.set(false);
    this.editingPointId.set(null);
    this.showModal.set(true);

  }

  openEditDialog(point: MapPoint): void {
    this.isEditMode.set(true);
    this.editingPointId.set(point.id || null);
    this.showModal.set(true);

    this.pointForm.patchValue({
      name: point.name,
      description: point.description || '',
      latitude: point.latitude,
      longitude: point.longitude,
      //icon_type: point.icon_type || 'default',
     // icon_color: point.icon_color || '#FF0000',
      category: point.category || ''
    });
  }

  savePoint(): void {
    if (this.pointForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    const formValue = this.pointForm.value;

    const pointData: MapPointCreate = {
      name: formValue.name,
      description: formValue.description,
      latitude: parseFloat(formValue.latitude),
      longitude: parseFloat(formValue.longitude),
          //icon_type: formValue.icon_type,
          //icon_color: formValue.icon_color,
      category: formValue.category || undefined
    };


  }

  

  closeDialog(): void {
    this.isEditMode.set(false);
    this.editingPointId.set(null);
    this.showModal.set(false);
    this.pointForm.reset();
    this.isLoading.set(false);
  }

  logout(): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Cerrar sesión
        this.authService.logout();

        // Mostrar mensaje de éxito
        Swal.fire({
          icon: 'success',
          title: 'Sesión cerrada',
          text: 'Has cerrado sesión correctamente',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
          position: 'center'
        }).then(() => {
          // Redirigir a la página principal
          this.router.navigate(['/']).then(() => {
            // Forzar recarga para limpiar cualquier estado residual
            window.location.href = '/';
          });
        });
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  openMapSelector(): void {
    const currentLat = this.pointForm.get('latitude')?.value;
    const currentLon = this.pointForm.get('longitude')?.value;

    const dialogData: MapSelectorData = {
      latitude: currentLat ? parseFloat(currentLat) : undefined,
      longitude: currentLon ? parseFloat(currentLon) : undefined
    };

    const dialogRef = this.dialog.open(MapSelectorDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      maxHeight: '90vh',
      data: dialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.latitude && result.longitude) {
        this.pointForm.patchValue({
          latitude: result.latitude,
          longitude: result.longitude
        });
      }
    });
  }

  // ========== GeoJSON Editor Methods ==========

  selectLayer(layer: GeoJsonLayer): void {
    this.selectedLayer.set(layer);
    this.currentLayerIcon = layer.icon; // Guardar el icono de la capa seleccionada
    this.updateVectorLayerStyle(); // Actualizar el estilo con el icono correcto
    this.loadGeojsonForEditing(layer);
  }

  private updateVectorLayerStyle(): void {
    if (!this.geojsonVectorSource) {
      return;
    }

    // Si ya existe la capa, actualizarla
    if (this.geojsonVectorLayer) {
      this.geojsonVectorLayer.setStyle((feature) => {
        return this.getStyleForFeature(feature);
      });
      return;
    }

    // Crear nueva capa con estilo
    this.geojsonVectorLayer = new VectorLayer({
      source: this.geojsonVectorSource,
      style: (feature) => {
        return this.getStyleForFeature(feature);
      }
    });
  }

  private getStyleForFeature(feature: FeatureLike): Style | Style[] {
    // Verificar si es una Feature real (no RenderFeature)
    if (!(feature instanceof Feature)) {
      // Para RenderFeature, usar estilo por defecto
      return new Style({
        fill: new Fill({ color: 'rgba(76, 175, 80, 0.2)' }),
        stroke: new Stroke({ color: '#4CAF50', width: 2 })
      });
    }

    const geometry = feature.getGeometry();
    const iconUrl = this.currentLayerIcon || 'assets/icons/marker.png';

    if (geometry instanceof Point) {
      return new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          src: iconUrl,
          scale: 0.5
        })
      });
    }

    // Para polígonos y líneas
    return new Style({
      fill: new Fill({ color: 'rgba(76, 175, 80, 0.2)' }),
      stroke: new Stroke({ color: '#4CAF50', width: 2 })
    });
  }

  private initGeojsonMap(): void {
    if (this.geojsonMap) {
      return; // El mapa ya está inicializado
    }

    const mapElement = document.getElementById('geojson-editor-map');
    if (!mapElement) {
      console.error('No se encontró el elemento del mapa');
      return;
    }

    // Crear fuente vectorial para el GeoJSON
    this.geojsonVectorSource = new VectorSource();
    this.updateVectorLayerStyle();

    // Crear mapa
    this.geojsonMap = new OlMap({
      target: 'geojson-editor-map',
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([-76.9989, -11.9964]), // Centro de San Juan de Lurigancho
        zoom: 13
      })
    });

    // Agregar la capa vectorial si existe
    if (this.geojsonVectorLayer) {
      this.geojsonMap.addLayer(this.geojsonVectorLayer);
    }

    // Agregar interacción de modificación (para mover features)
    this.modifyInteraction = new Modify({ source: this.geojsonVectorSource });
    this.modifyInteraction.setActive(false); // Inactivo por defecto
    this.geojsonMap.addInteraction(this.modifyInteraction);

    // Agregar interacción de dibujo para puntos (inactivo por defecto)
    this.drawInteraction = new Draw({
      source: this.geojsonVectorSource,
      type: 'Point'
    });
    this.drawInteraction.setActive(false);
    this.geojsonMap.addInteraction(this.drawInteraction);

    // Crear popup overlay
    const popupElement = document.getElementById('geojson-feature-popup');
    if (popupElement) {
      this.popupOverlay = new Overlay({
        element: popupElement,
        positioning: 'bottom-center',
        stopEvent: false,
        offset: [0, -10],
        autoPan: {
          animation: {
            duration: 250
          }
        }
      });
      this.geojsonMap.addOverlay(this.popupOverlay);
    }

    // Agregar evento de clic en el mapa para seleccionar features
    this.geojsonMap.on('click', (event) => {
      if (this.isAddMode()) {
        // Si está en modo agregar, no hacer nada (el Draw se encarga)
        return;
      }

      const popupElement = document.getElementById('geojson-feature-popup');
      const feature = this.geojsonMap?.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature
      );

      if (feature && feature instanceof Feature) {
        this.selectedFeature.set(feature);
        const coordinate = event.coordinate;
        if (this.popupOverlay && popupElement) {
          popupElement.style.display = 'block';
          this.popupOverlay.setPosition(coordinate);
        }
      } else {
        this.closeFeaturePopup();
      }
    });

    // Evento cuando se completa el dibujo de un nuevo punto
    this.drawInteraction.on('drawend', (event) => {
      const feature = event.feature;
      // Aplicar el estilo correcto al nuevo punto
      if (feature && this.currentLayerIcon) {
        const geometry = feature.getGeometry();
        if (geometry instanceof Point) {
          feature.setStyle(new Style({
            image: new Icon({
              anchor: [0.5, 0.5],
              src: this.currentLayerIcon,
              scale: 0.5
            })
          }));
        }
      }
      this.isAddMode.set(false);
      this.drawInteraction?.setActive(false);
      this.updateFeatureCount();
    });

    // Actualizar contador de features
    this.geojsonVectorSource.on('addfeature', () => {
      this.updateFeatureCount();
      this.featuresList = this.geojsonVectorSource!.getFeatures();
    });
    this.geojsonVectorSource.on('removefeature', () => {
      this.updateFeatureCount();
      this.featuresList = this.geojsonVectorSource!.getFeatures();
    });
    this.geojsonVectorSource.on('clear', () => {
      this.updateFeatureCount();
      this.featuresList = [];
    });
  }

  private loadGeojsonForEditing(layer: GeoJsonLayer): void {
    if (!layer) return;

    // Inicializar mapa si no está inicializado
    setTimeout(() => {
      this.initGeojsonMap();
    }, 100);

    // Cargar GeoJSON desde Supabase Storage
    this.geojsonService.loadGeojsonFile(layer.file).subscribe({
      next: (text) => {
        try {
          const geoJson = JSON.parse(text);

          if (!this.geojsonVectorSource) {
            console.error('Vector source no inicializado');
            return;
          }

          // Limpiar features existentes
          this.geojsonVectorSource.clear();
          this.featuresList = [];

          // Cargar features desde GeoJSON
          const format = new GeoJSON();
          const features = format.readFeatures(geoJson, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
          });

          this.geojsonVectorSource.addFeatures(features);
          this.featuresList = features;
          this.updateFeatureCount();
          // Actualizar el estilo de la capa con el icono correcto
          this.updateVectorLayerStyle();

          // Ajustar vista para mostrar todas las features
          if (features.length > 0) {
            const extent = this.geojsonVectorSource.getExtent();
            this.geojsonMap?.getView().fit(extent, {
              padding: [50, 50, 50, 50],
              duration: 1000
            });
          }

          Swal.fire({
            icon: 'success',
            title: 'GeoJSON cargado',
            text: `Se cargaron ${features.length} features`,
            timer: 2000,
            showConfirmButton: false,
            position: 'center'
          });
        } catch (error) {
          console.error('Error al parsear GeoJSON:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar el GeoJSON'
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar GeoJSON:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el archivo GeoJSON desde Supabase Storage'
        });
      }
    });
  }

  private updateFeatureCount(): void {
    if (this.geojsonVectorSource) {
      this.featureCount.set(this.geojsonVectorSource.getFeatures().length);
    }
  }

  saveGeojson(): void {
    const layer = this.selectedLayer();
    if (!layer || !this.geojsonVectorSource) {
      return;
    }

    this.isSavingGeojson.set(true);

    // Convertir features a GeoJSON
    const format = new GeoJSON();
    const features = this.geojsonVectorSource.getFeatures();
    const geoJsonString = format.writeFeatures(features, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326'
    });

    // Parsear el string a objeto JSON
    let geoJson: any;
    try {
      geoJson = JSON.parse(geoJsonString);

      // Asegurar que sea un FeatureCollection válido
      if (geoJson.type !== 'FeatureCollection') {
        geoJson = {
          type: 'FeatureCollection',
          features: Array.isArray(geoJson) ? geoJson : [geoJson]
        };
      }

      // Si geoJson es un array de features, convertirlo a FeatureCollection
      if (Array.isArray(geoJson) && geoJson.length > 0 && geoJson[0].type === 'Feature') {
        geoJson = {
          type: 'FeatureCollection',
          features: geoJson
        };
      }
    } catch (error) {
      console.error('Error al parsear GeoJSON:', error);
      this.isSavingGeojson.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al convertir el GeoJSON'
      });
      return;
    }

    // Guardar en Supabase Storage
    this.geojsonService.saveGeojsonFile(layer.file, geoJson).subscribe({
      next: () => {
        this.isSavingGeojson.set(false);
        Swal.fire({
          icon: 'success',
          title: '¡Guardado exitosamente!',
          text: `El archivo ${layer.file} ha sido guardado/actualizado en Supabase Storage`,
          timer: 3000,
          showConfirmButton: false,
          position: 'center'
        });
      },
      error: (error) => {
        console.error('Error al guardar GeoJSON:', error);
        this.isSavingGeojson.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar el archivo GeoJSON'
        });
      }
    });
  }

  toggleAddMode(): void {
    const currentMode = this.isAddMode();
    this.isAddMode.set(!currentMode);

    if (!currentMode) {
      // Activar modo agregar
      this.drawInteraction?.setActive(true);
      this.modifyInteraction?.setActive(false);
      this.isMoveMode.set(false);
      this.closeFeaturePopup();
    } else {
      // Desactivar modo agregar
      this.drawInteraction?.setActive(false);
    }
  }

  enableMoveMode(): void {
    this.isMoveMode.set(true);
    this.modifyInteraction?.setActive(true);
    this.drawInteraction?.setActive(false);
    this.isAddMode.set(false);
    this.closeFeaturePopup();

    // Desactivar modo mover después de que se complete la modificación
    if (this.modifyInteraction) {
      this.modifyInteraction.once('modifyend', () => {
        this.isMoveMode.set(false);
        this.modifyInteraction?.setActive(false);
      });
    }
  }

  deleteSelectedFeature(): void {
    const feature = this.selectedFeature();
    if (!feature || !this.geojsonVectorSource) {
      return;
    }

    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea eliminar esta ubicación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.geojsonVectorSource?.removeFeature(feature);
        this.closeFeaturePopup();
        this.updateFeatureCount();
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'La ubicación ha sido eliminada',
          timer: 2000,
          showConfirmButton: false,
          position: 'center'
        });
      }
    });
  }

  closeFeaturePopup(): void {
    this.selectedFeature.set(null);
    const popupElement = document.getElementById('geojson-feature-popup');
    if (popupElement) {
      popupElement.style.display = 'none';
    }
    if (this.popupOverlay) {
      this.popupOverlay.setPosition(undefined);
    }
  }

  abrirSubirArchivo(modo: 'nuevo' | 'reemplazar'): void {
    const layer = this.selectedLayer();
    const data: SubirGeojsonData = {
      modo,
      layerId: layer?.id,
      nombreActual: layer?.name,
      archivoActual: layer?.file
    };

    const dialogRef = this.dialog.open(SubirGeojsonComponent, {
      width: '600px',
      maxWidth: '90vw',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Recargar las capas desde Supabase
        this.geojsonLayersService.reloadLayers().subscribe({
          next: (layers) => {
            this.geojsonLayers = layers.filter(l => l.id !== 'gps');
            // Si se reemplazó, recargar el GeoJSON
            if (modo === 'reemplazar' && layer) {
              // Buscar la capa actualizada
              const updatedLayer = this.geojsonLayers.find(l => l.file === layer.file);
              if (updatedLayer) {
                this.loadGeojsonForEditing(updatedLayer);
              }
            }
          },
          error: (error) => {
            console.error('Error al recargar capas:', error);
          }
        });
      }
    });
  }

  getFeatureName(feature: Feature): string {
    const props = feature.getProperties();
    return props['name'] || props['nombre'] || props['titulo'] || 'Sin nombre';
  }

  getFeatureCoordinates(feature: Feature): string {
    const geometry = feature.getGeometry();
    if (geometry instanceof Point) {
      const coords = geometry.getCoordinates();
      const lonLat = toLonLat(coords);
      return `${lonLat[1].toFixed(6)}, ${lonLat[0].toFixed(6)}`;
    }
    return '';
  }

  eliminarGeojson(): void {
    const layer = this.selectedLayer();
    if (!layer) {
      return;
    }

    // No permitir eliminar el límite SJL
    if (layer.id === 'gps') {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'El límite SJL no puede ser eliminado',
        position: 'center'
      });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará el archivo "${layer.name}" (${layer.file}). Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      position: 'center'
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarGeojsonConfirmado(layer);
      }
    });
  }

  private eliminarGeojsonConfirmado(layer: GeoJsonLayer): void {
    // Eliminar el archivo de Storage usando el servicio de Supabase
    from(
      this.supabaseService.supabase.storage
        .from('data')
        .remove([`geojson/${layer.file}`])
    ).subscribe({
      next: ({ error: storageError }) => {
        if (storageError) {
          console.error('Error al eliminar archivo de Storage:', storageError);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el archivo de Storage',
            position: 'center'
          });
          return;
        }

        // Eliminar el registro de la tabla de nombres
        this.geojsonNombresService.getNombreByArchivo(layer.file).subscribe({
          next: (nombreRegistro) => {
            if (nombreRegistro) {
              this.geojsonNombresService.eliminarNombre(nombreRegistro.id).subscribe({
                next: () => {
                  this.recargarCapasDespuesEliminar(layer);
                },
                error: (error) => {
                  console.error('Error al eliminar registro de nombres:', error);
                  Swal.fire({
                    icon: 'warning',
                    title: 'Advertencia',
                    text: 'El archivo se eliminó pero hubo un error al eliminar el registro',
                    position: 'center'
                  });
                  this.recargarCapasDespuesEliminar(layer);
                }
              });
            } else {
              this.recargarCapasDespuesEliminar(layer);
            }
          },
          error: (error) => {
            console.error('Error al buscar registro:', error);
            this.recargarCapasDespuesEliminar(layer);
          }
        });
      },
      error: (error) => {
        console.error('Error al eliminar archivo:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar el archivo',
          position: 'center'
        });
      }
    });
  }

  private recargarCapasDespuesEliminar(layer: GeoJsonLayer): void {
    // Recargar las capas
    this.geojsonLayersService.reloadLayers().subscribe({
      next: (layers) => {
        this.geojsonLayers = layers.filter(l => l.id !== 'gps');
        this.selectedLayer.set(null);
        this.geojsonVectorSource?.clear();
        this.featuresList = [];
        this.updateFeatureCount();

        Swal.fire({
          icon: 'success',
          title: '¡Eliminado!',
          text: `El archivo "${layer.name}" ha sido eliminado exitosamente`,
          timer: 2000,
          showConfirmButton: false,
          position: 'center'
        });
      },
      error: (error) => {
        console.error('Error al recargar capas:', error);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.geojsonMap) {
      this.geojsonMap.setTarget(undefined);
      this.geojsonMap = undefined;
    }
  }
}

