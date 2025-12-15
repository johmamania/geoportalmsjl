import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../material/material.module';
import { PublicacionesService, Publicacion } from '../../../../services/publicaciones.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registrar-publicaciones',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './registrar-publicaciones.component.html',
  styleUrl: './registrar-publicaciones.component.css'
})
export class RegistrarPublicacionesComponent implements OnInit {
  publicacionForm: FormGroup;
  cargando = false;
  esEdicion = false;

  constructor(
    private fb: FormBuilder,
    private publicacionesService: PublicacionesService,
    private dialogRef: MatDialogRef<RegistrarPublicacionesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { publicacion?: Publicacion }
  ) {
    this.publicacionForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
     // contenido: [''],
      categoria: ['', Validators.required],
      autor: ['', Validators.required],
      fecha: ['', Validators.required],
      imagenruta: [''],
      activo: [true]
    });
  }

  ngOnInit(): void {
    if (this.data?.publicacion) {
      this.esEdicion = true;
      this.cargarPublicacion(this.data.publicacion);
    } else {
      // Establecer fecha por defecto a hoy
      const hoy = new Date().toISOString().split('T')[0];
      this.publicacionForm.patchValue({ fecha: hoy });
    }
  }

  cargarPublicacion(publicacion: Publicacion): void {
    this.publicacionForm.patchValue({
      titulo: publicacion.titulo,
      descripcion: publicacion.descripcion,
   //   contenido: publicacion.contenido || '',
      categoria: publicacion.categoria,
      autor: publicacion.autor,
      fecha: publicacion.fecha ? publicacion.fecha.split('T')[0] : '',
      imagenruta: publicacion.imagenruta || '',
      activo: publicacion.activo !== undefined ? publicacion.activo : true
    });
  }

  guardar(): void {
    if (this.publicacionForm.invalid) {
      this.publicacionForm.markAllAsTouched();
      Swal.fire({
        title: 'Formulario inválido',
        text: 'Por favor, completa todos los campos requeridos',
        icon: 'warning',
        position: 'center',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.cargando = true;
    const publicacionData = this.publicacionForm.value;

    if (this.esEdicion && this.data?.publicacion?.id) {
      // Actualizar
      this.publicacionesService.updatePublicacion(this.data.publicacion.id, publicacionData).subscribe({
        next: () => {
          Swal.fire({
            title: 'Actualizado',
            text: 'La publicación ha sido actualizada exitosamente',
            icon: 'success',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al actualizar publicación:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar la publicación',
            icon: 'error',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.cargando = false;
        }
      });
    } else {
      // Crear
      this.publicacionesService.createPublicacion(publicacionData).subscribe({
        next: () => {
          Swal.fire({
            title: 'Creado',
            text: 'La publicación ha sido creada exitosamente',
            icon: 'success',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al crear publicación:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear la publicación',
            icon: 'error',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.cargando = false;
        }
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.publicacionForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field?.hasError('minlength')) {
      return `Mínimo ${field.errors?.['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
