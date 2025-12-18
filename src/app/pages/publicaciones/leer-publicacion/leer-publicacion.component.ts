import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../material/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Publicacion } from '../../../services/publicaciones.service';

@Component({
  selector: 'app-leer-publicacion',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './leer-publicacion.component.html',
  styleUrl: './leer-publicacion.component.css'
})
export class LeerPublicacionComponent implements OnInit {
  publicacion: Publicacion;

  constructor(
    public dialogRef: MatDialogRef<LeerPublicacionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { publicacion: Publicacion }
  ) {
    this.publicacion = data.publicacion;
  }

  ngOnInit(): void {
  }

  getCategoriaColor(categoria: string): string {
    const colores: { [key: string]: string } = {
      'Tecnología': '#4A90E2',
      'Actualización': '#50C878',
      'Documentación': '#FF6B6B',
      'Novedades': '#FFA500',
      'Mejoras': '#9B59B6',
      'Eventos': '#E74C3C'
    };
    return colores[categoria] || '#6b8e23';
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}

