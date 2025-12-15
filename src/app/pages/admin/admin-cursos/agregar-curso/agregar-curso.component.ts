import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../material/material.module';
import { CursosAdminService, Curso } from '../../../../services/cursos-admin.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agregar-curso',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './agregar-curso.component.html',
  styleUrl: './agregar-curso.component.css'
})
export class AgregarCursoComponent implements OnInit {
  cursoForm: FormGroup;
  cargando = false;
  esEdicion = false;

  niveles = ['Principiante', 'Intermedio', 'Avanzado'];
  categorias = ['Tecnología', 'Gestión', 'Desarrollo', 'Diseño', 'Marketing', 'Otros'];

  constructor(
    private fb: FormBuilder,
    private cursosService: CursosAdminService,
    private dialogRef: MatDialogRef<AgregarCursoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { curso?: Curso }
  ) {
    this.cursoForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      duracion: ['', Validators.required],
      nivel: ['', Validators.required],
      categoria: ['', Validators.required],
      certificado: [false],
      instructor: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      imagen: [''],
      precio: [0],
      estado: [true]
    });
  }

  ngOnInit(): void {
    if (this.data?.curso) {
      this.esEdicion = true;
      this.cargarCurso(this.data.curso);
    } else {
      // Establecer fecha por defecto a hoy
      const hoy = new Date().toISOString().split('T')[0];
      this.cursoForm.patchValue({ fecha_inicio: hoy });
    }
  }

  cargarCurso(curso: Curso): void {
    this.cursoForm.patchValue({
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      duracion: curso.duracion,
      nivel: curso.nivel,
      categoria: curso.categoria,
      certificado: curso.certificado !== undefined ? curso.certificado : false,
      instructor: curso.instructor,
      fecha_inicio: curso.fecha_inicio ? curso.fecha_inicio.split('T')[0] : '',
      imagen: curso.imagen || '',
      precio: curso.precio || 0,
      estado: curso.estado !== undefined ? curso.estado : true
    });
  }

  guardar(): void {
    if (this.cursoForm.invalid) {
      this.cursoForm.markAllAsTouched();
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
    const cursoData = this.cursoForm.value;

    if (this.esEdicion && this.data?.curso?.id) {
      // Actualizar
      this.cursosService.updateCurso(this.data.curso.id, cursoData).subscribe({
        next: () => {
          Swal.fire({
            title: 'Actualizado',
            text: 'El curso ha sido actualizado exitosamente',
            icon: 'success',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al actualizar curso:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el curso',
            icon: 'error',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.cargando = false;
        }
      });
    } else {
      // Crear
      this.cursosService.createCurso(cursoData).subscribe({
        next: () => {
          Swal.fire({
            title: 'Creado',
            text: 'El curso ha sido creado exitosamente',
            icon: 'success',
            position: 'center',
            confirmButtonText: 'Aceptar'
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al crear curso:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear el curso',
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
    const field = this.cursoForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field?.hasError('minlength')) {
      return `Mínimo ${field.errors?.['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}

