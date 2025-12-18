import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GeojsonService } from '../../../services/geojson.service';
import { GeojsonNombresService } from '../../../services/geojson-nombres.service';
import Swal from 'sweetalert2';

export interface SubirGeojsonData {
  modo: 'nuevo' | 'reemplazar';
  layerId?: string;
  nombreActual?: string;
  archivoActual?: string;
}

@Component({
  selector: 'app-subir-geojson',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './subir-geojson.component.html',
  styleUrl: './subir-geojson.component.css'
})
export class SubirGeojsonComponent implements OnInit {
  archivoForm: FormGroup;
  archivoSeleccionado: File | null = null;
  modo: 'nuevo' | 'reemplazar';
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<SubirGeojsonComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubirGeojsonData,
    private fb: FormBuilder,
    private geojsonService: GeojsonService,
    private geojsonNombresService: GeojsonNombresService
  ) {
    this.modo = data.modo;
    // Si es modo "nuevo", no cargar ningún nombre (se llenará al seleccionar archivo)
    // Si es modo "reemplazar", cargar el nombre actual
    const nombreInicial = this.modo === 'nuevo' ? '' : (data.nombreActual || '');
    this.archivoForm = this.fb.group({
      nombre: [nombreInicial, [Validators.required, Validators.minLength(3)]],
      archivo: [null, Validators.required]
    });
  }

  ngOnInit(): void {
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/geo+json' && !file.name.endsWith('.geojson')) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo inválido',
          text: 'Por favor, seleccione un archivo GeoJSON válido (.geojson)',
          position: 'center'
        });
        return;
      }
      this.archivoSeleccionado = file;
      this.archivoForm.patchValue({ archivo: file.name });

      // Si el campo nombre está vacío, llenarlo con el nombre del archivo sin la extensión
      const nombreActual = this.archivoForm.get('nombre')?.value;
      if (!nombreActual || nombreActual.trim() === '') {
        // Extraer el nombre del archivo sin la extensión .geojson
        const nombreSinExtension = file.name.replace(/\.geojson$/i, '');
        this.archivoForm.patchValue({ nombre: nombreSinExtension });
      }
    }
  }

  async guardar(): Promise<void> {
    if (this.archivoForm.invalid || !this.archivoSeleccionado) {
      this.archivoForm.markAllAsTouched();
      Swal.fire({
        icon: 'error',
        title: 'Error de validación',
        text: 'Por favor, complete todos los campos requeridos',
        position: 'center'
      });
      return;
    }

    this.loading = true;

    try {
      // Leer el archivo como texto
      const texto = await this.archivoSeleccionado.text();
      let geoJson: any;

      try {
        geoJson = JSON.parse(texto);
        if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
          throw new Error('El archivo no es un FeatureCollection válido');
        }
      } catch (error) {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El archivo GeoJSON no es válido',
          position: 'center'
        });
        return;
      }

      // Determinar el nombre del archivo
      // Si es reemplazar, mantener el nombre del archivo original
      // Si es nuevo, usar el nombre del archivo seleccionado
      const nombreArchivoStorage = this.modo === 'reemplazar' && this.data.archivoActual
        ? this.data.archivoActual
        : `${this.archivoSeleccionado.name}`;

      // El nombre del archivo en la BD siempre será el mismo que se guarda en storage
      const nombreArchivoBD = nombreArchivoStorage;

      // Guardar el archivo en storage (pasar el archivo original para mejor compatibilidad)
      this.geojsonService.saveGeojsonFile(nombreArchivoStorage, geoJson, this.archivoSeleccionado).subscribe({
        next: () => {
          // Guardar el nombre en la tabla de nombres
          const nombre = this.archivoForm.get('nombre')?.value;
          if (this.modo === 'reemplazar' && this.data.archivoActual) {
            // Buscar si existe un registro con ese archivo y actualizarlo
            this.geojsonNombresService.getNombreByArchivo(this.data.archivoActual).subscribe({
              next: (nombreExistente) => {
                if (nombreExistente) {
                  // Actualizar nombre existente por ID (mantener el mismo nombre de archivo)
                  this.geojsonNombresService.actualizarNombre(nombreExistente.id, nombre, nombreArchivoBD).subscribe({
                    next: () => {
                      this.loading = false;
                      Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: 'Archivo reemplazado exitosamente',
                        position: 'center'
                      });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
                    },
                    error: (error) => {
                      console.error('Error al actualizar nombre:', error);
                      this.loading = false;
                      Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'El archivo se guardó pero hubo un error al actualizar el nombre',
                        position: 'center'
                      });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
                    }
                  });
                } else {
                  // No existe, crear nuevo registro
                  this.geojsonNombresService.crearNombre(nombre, nombreArchivoBD).subscribe({
                    next: () => {
                      this.loading = false;
                      Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: 'Archivo reemplazado exitosamente',
                        position: 'center'
                      });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
                    },
                    error: (error) => {
                      console.error('Error al crear nombre:', error);
                      this.loading = false;
                      Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'El archivo se guardó pero hubo un error al guardar el nombre',
                        position: 'center'
                      });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
                    }
                  });
                }
              },
              error: (error) => {
                console.error('Error al buscar nombre existente:', error);
                // Intentar crear nuevo registro si no se encuentra
                this.geojsonNombresService.crearNombre(nombre, nombreArchivoBD).subscribe({
                  next: () => {
                    this.loading = false;
                    Swal.fire({
                      icon: 'success',
                      title: '¡Éxito!',
                      text: 'Archivo reemplazado exitosamente',
                      position: 'center'
                    });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
                  },
                  error: (createError) => {
                    console.error('Error al crear nombre:', createError);
                    this.loading = false;
                    Swal.fire({
                      icon: 'warning',
                      title: 'Advertencia',
                      text: 'El archivo se guardó pero hubo un error al guardar el nombre',
                      position: 'center'
                    });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
                  }
                });
              }
            });
          } else {
            // Crear nuevo registro
            this.geojsonNombresService.crearNombre(nombre, nombreArchivoBD).subscribe({
              next: () => {
                this.loading = false;
                Swal.fire({
                  icon: 'success',
                  title: '¡Éxito!',
                  text: 'Archivo subido exitosamente',
                  position: 'center'
                });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
              },
              error: (error) => {
                console.error('Error al crear nombre:', error);
                this.loading = false;
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'El archivo se guardó pero hubo un error al guardar el nombre',
                  position: 'center'
                });
                      this.dialogRef.close({ success: true, nombre, archivo: nombreArchivoBD });
              }
            });
          }
        },
        error: (error) => {
          console.error('Error al guardar archivo:', error);
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar el archivo',
            position: 'center'
          });
        }
      });
    } catch (error) {
      console.error('Error al leer archivo:', error);
      this.loading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo leer el archivo',
        position: 'center'
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close({ success: false });
  }
}

