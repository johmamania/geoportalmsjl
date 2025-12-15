import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material/material.module';
import { PublicacionesService, Publicacion } from '../../../services/publicaciones.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { RegistrarPublicacionesComponent } from './registrar-publicaciones/registrar-publicaciones.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-publicaciones',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './admin-publicaciones.component.html',
  styleUrl: './admin-publicaciones.component.css'
})
export class AdminPublicacionesComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['titulo', 'categoria', 'autor', 'fecha', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<Publicacion>([]);
  cargando = false;
  searchTerm = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private publicacionesService: PublicacionesService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.cargarPublicaciones();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  cargarPublicaciones(): void {
    this.cargando = true;
    this.publicacionesService.getPublicaciones().subscribe({
      next: (publicaciones) => {
        this.dataSource.data = publicaciones;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar publicaciones:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las publicaciones',
          icon: 'error',
          position: 'center',
          confirmButtonText: 'Aceptar'
        });
        this.cargando = false;
      }
    });
  }

  aplicarFiltro(): void {
    const filterValue = this.searchTerm.trim().toLowerCase();
    this.dataSource.filter = filterValue;

    // Configurar el filtro personalizado para buscar en múltiples columnas
    this.dataSource.filterPredicate = (data: Publicacion, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.titulo?.toLowerCase().includes(searchStr) ||
        data.categoria?.toLowerCase().includes(searchStr) ||
        data.autor?.toLowerCase().includes(searchStr) ||
        data.descripcion?.toLowerCase().includes(searchStr) ||
        false
      );
    };

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  limpiarBusqueda(): void {
    this.searchTerm = '';
    this.aplicarFiltro();
  }

  agregarPublicacion(): void {
    const dialogRef = this.dialog.open(RegistrarPublicacionesComponent, {
      width: '90%',
      maxHeight: '90vh',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarPublicaciones();
      }
    });
  }

  editarPublicacion(publicacion: Publicacion): void {
    const dialogRef = this.dialog.open(RegistrarPublicacionesComponent, {

      width: '90%',
      maxHeight: '90vh',
      data: { publicacion }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarPublicaciones();
      }
    });
  }

  eliminarPublicacion(publicacion: Publicacion): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar la publicación "${publicacion.titulo}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      position: 'center'
    }).then((result) => {
      if (result.isConfirmed && publicacion.id) {
        this.publicacionesService.deletePublicacion(publicacion.id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Eliminado',
              text: 'La publicación ha sido eliminada exitosamente',
              icon: 'success',
              position: 'center',
              confirmButtonText: 'Aceptar'
            });
            this.cargarPublicaciones();
          },
          error: (error) => {
            console.error('Error al eliminar publicación:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar la publicación',
              icon: 'error',
              position: 'center',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

