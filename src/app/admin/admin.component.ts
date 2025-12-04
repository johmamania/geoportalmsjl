import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../material/material.module';
import { MapDataService } from '../services/map-data.service';
import { AdminAuthService } from '../services/admin-auth.service';
import { MapPoint, MapPointCreate } from '../model/map-point';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['name', 'description', 'latitude', 'longitude', 'category', 'created_at', 'actions'];
  dataSource = new MatTableDataSource<MapPoint>([]);

  pointForm: FormGroup;
  isEditMode = signal(false);
  editingPointId = signal<string | null>(null);
  isLoading = signal(false);
  showModal = signal(false);

  // Paginación
  pageSize = signal(10);
  pageIndex = signal(0);
  totalItems = signal(0);
  pageSizeOptions = [5, 10, 25, 50];

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

    // Suscribirse a cambios en los puntos
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
    this.dataSource.data = points;
    this.totalItems.set(points.length);

    // Aplicar paginación
    const startIndex = this.pageIndex() * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    this.dataSource.data = points.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.loadPoints();
  }

  openAddDialog(): void {
    this.isEditMode.set(false);
    this.editingPointId.set(null);
    this.showModal.set(true);
    this.pointForm.reset({
      icon_type: 'default',
      icon_color: '#FF0000'
    });
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
      icon_type: point.icon_type || 'default',
      icon_color: point.icon_color || '#FF0000',
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
      icon_type: formValue.icon_type,
      icon_color: formValue.icon_color,
      category: formValue.category || undefined
    };

    if (this.isEditMode() && this.editingPointId()) {
      // Actualizar punto existente
      this.mapDataService.updatePoint(this.editingPointId()!, pointData).subscribe({
        next: () => {
          this.closeDialog();
          this.loadPoints();
        },
        error: (error) => {
          console.error('Error al actualizar punto:', error);
          this.isLoading.set(false);
        }
      });
    } else {
      // Crear nuevo punto
      this.mapDataService.createPoint(pointData).subscribe({
        next: () => {
          this.closeDialog();
          this.loadPoints();
        },
        error: (error) => {
          console.error('Error al crear punto:', error);
          this.isLoading.set(false);
        }
      });
    }
  }

  deletePoint(point: MapPoint): void {
    if (!point.id) return;

    if (confirm(`¿Está seguro de eliminar el punto "${point.name}"?`)) {
      this.isLoading.set(true);
      this.mapDataService.deletePoint(point.id).subscribe({
        next: () => {
          this.loadPoints();
        },
        error: (error) => {
          console.error('Error al eliminar punto:', error);
          this.isLoading.set(false);
        }
      });
    }
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
}

