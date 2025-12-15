import { Component, OnInit, ViewChild } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { Publicacion, PublicacionesService } from '../../services/publicaciones.service';
import { MatPaginator } from '@angular/material/paginator';
import { Observable, of } from 'rxjs';



@Component({
  selector: 'app-publicaciones',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './publicaciones.component.html',
  styleUrl: './publicaciones.component.css'
})
export class PublicacionesComponent implements OnInit{
  publicaciones: Observable<Publicacion[]> = of([]);

  constructor(private publicacionesService: PublicacionesService) {
    this.publicaciones = this.publicacionesService.getPublicaciones();
  }

  ngOnInit(): void {
    this.publicaciones = this.publicacionesService.getPublicaciones();
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
}
