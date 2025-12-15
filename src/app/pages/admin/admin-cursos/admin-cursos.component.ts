import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material/material.module';
import { CursosAdminService, Curso } from '../../../services/cursos-admin.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { AgregarCursoComponent } from './agregar-curso/agregar-curso.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './admin-cursos.component.html',
  styleUrl: './admin-cursos.component.css'
})
export class AdminCursosComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['titulo', 'categoria', 'nivel', 'instructor', 'duracion', 'precio', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<Curso>([]);
  cargando = false;
  searchTerm = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private cursosService: CursosAdminService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.cargarCursos();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  cargarCursos(): void {
    this.cargando = true;
    this.cursosService.getCursos().subscribe({
      next: (cursos) => {
        this.dataSource.data = cursos;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar cursos:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los cursos',
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
    this.dataSource.filterPredicate = (data: Curso, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.titulo?.toLowerCase().includes(searchStr) ||
        data.categoria?.toLowerCase().includes(searchStr) ||
        data.nivel?.toLowerCase().includes(searchStr) ||
        data.instructor?.toLowerCase().includes(searchStr) ||
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

  agregarCurso(): void {
    const dialogRef = this.dialog.open(AgregarCursoComponent, {
      width: '90%',

      maxHeight: '90vh',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarCursos();
      }
    });
  }

  editarCurso(curso: Curso): void {
    const dialogRef = this.dialog.open(AgregarCursoComponent, {
      width: '90%',
    
      maxHeight: '90vh',
      data: { curso }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarCursos();
      }
    });
  }

  eliminarCurso(curso: Curso): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el curso "${curso.titulo}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      position: 'center'
    }).then((result) => {
      if (result.isConfirmed && curso.id) {
        this.cursosService.deleteCurso(curso.id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Eliminado',
              text: 'El curso ha sido eliminado exitosamente',
              icon: 'success',
              position: 'center',
              confirmButtonText: 'Aceptar'
            });
            this.cargarCursos();
          },
          error: (error) => {
            console.error('Error al eliminar curso:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar el curso',
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

  formatearPrecio(precio?: number): string {
    if (precio === undefined || precio === null) return 'Gratis';
    return `S/ ${precio.toFixed(2)}`;
  }
}

