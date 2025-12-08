import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from '../../material/material.module';
import { MapDataService } from '../../services/map-data.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { MapPoint, MapPointCreate } from '../../model/map-point';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MapSelectorDialogComponent, MapSelectorData } from './map-selector-dialog.component';

import Swal from 'sweetalert2';
import { VisitsComponent } from './visits/visits.component';
import { DashboardComponent } from './dashboard/dashboard.component';


@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    VisitsComponent,
    DashboardComponent
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
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
  pageSize = signal(10);
  pageIndex = signal(0);
  totalItems = signal(0);
  pageSizeOptions = [5, 10, 25, 50,70,100,150,200,300];

  constructor(
    private fb: FormBuilder,
    private mapDataService: MapDataService,
    private authService: AdminAuthService,
    private dialog: MatDialog,
    private router: Router
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
    this.loadPoints();
    this.mapDataService.getPoints().subscribe(points => {
      this.updateDataSource(points);
    });
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  loadPoints(): void {
    this.isLoading.set(true);
    this.mapDataService.getPoints().subscribe({
      next: (points) => {
        this.updateDataSource(points);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar puntos:', error);
        this.isLoading.set(false);
      }
    });
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

    if (this.isEditMode() && this.editingPointId()) {
      // Actualizar punto existente
      this.mapDataService.updatePoint(this.editingPointId()!, pointData).subscribe({
        next: () => {
          this.isLoading.set(false);
          Swal.fire({
            icon: 'success',
            title: '¡Actualizado con éxito!',
            text: 'El punto ha sido actualizado correctamente',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          this.closeDialog();
          this.loadPoints();
        },
        error: (error) => {
          console.error('Error al actualizar punto:', error);
          this.isLoading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el punto',
            confirmButtonColor: '#d32f2f'
          });
        }
      });
    } else {
      // Crear nuevo punto
      this.mapDataService.createPoint(pointData).subscribe({
        next: () => {
          this.isLoading.set(false);
          Swal.fire({
            icon: 'success',
            title: '¡Guardado con éxito!',
            text: 'El punto ha sido guardado correctamente',
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
          });
          this.closeDialog();
          this.loadPoints();
        },
        error: (error) => {
          console.error('Error al crear punto:', error);
          this.isLoading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el punto',
            confirmButtonColor: '#d32f2f'
          });
        }
      });
    }
  }

  deletePoint(point: MapPoint): void {
    if (!point.id) return;

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el punto "${point.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading.set(true);
        this.mapDataService.deletePoint(point.id!).subscribe({
          next: () => {
            this.isLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: '¡Eliminado con éxito!',
              text: 'El punto ha sido eliminado correctamente',
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false,
              toast: true,
              position: 'top-end'
            });
            this.loadPoints();
          },
          error: (error) => {
            console.error('Error al eliminar punto:', error);
            this.isLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el punto',
              confirmButtonColor: '#d32f2f'
            });
          }
        });
      }
    });
  }

  closeDialog(): void {
    this.isEditMode.set(false);
    this.editingPointId.set(null);
    this.showModal.set(false);
    this.pointForm.reset();
    this.isLoading.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
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
}

