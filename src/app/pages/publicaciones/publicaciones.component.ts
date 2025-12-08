import { Component } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';

interface Publicacion {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  categoria: string;
  autor: string;
  imagen?: string;
}

@Component({
  selector: 'app-publicaciones',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './publicaciones.component.html',
  styleUrl: './publicaciones.component.css'
})
export class PublicacionesComponent {
  publicaciones: Publicacion[] = [
    {
      id: 1,
      titulo: 'Nuevo Sistema de Información Geográfica',
      descripcion: 'Presentamos nuestro nuevo sistema de información geográfica que permite visualizar y gestionar datos espaciales del distrito de San Juan de Lurigancho.',
      fecha: '15 de Enero, 2024',
      categoria: 'Tecnología',
      autor: 'Equipo GeoPortal'
    },
    {
      id: 2,
      titulo: 'Actualización de Mapas y Ubicaciones',
      descripcion: 'Hemos actualizado más de 500 puntos de interés en el distrito, incluyendo puntos de reunión, albergues temporales, hidrantes y áreas de concentración.',
      fecha: '10 de Enero, 2024',
      categoria: 'Actualización',
      autor: 'Departamento de Cartografía'
    },
    {
      id: 3,
      titulo: 'Guía de Uso del GeoPortal',
      descripcion: 'Aprende a utilizar todas las funcionalidades del GeoPortal con nuestra nueva guía interactiva. Incluye tutoriales paso a paso y ejemplos prácticos.',
      fecha: '5 de Enero, 2024',
      categoria: 'Documentación',
      autor: 'Equipo de Soporte'
    },
    {
      id: 4,
      titulo: 'Nuevas Capas WMS Disponibles',
      descripcion: 'Agregamos nuevas capas de información del IGN y CENEPRED para mejorar la visualización de datos geográficos en el mapa.',
      fecha: '28 de Diciembre, 2023',
      categoria: 'Novedades',
      autor: 'Equipo de Desarrollo'
    },
    {
      id: 5,
      titulo: 'Mejoras en la Navegación del Mapa',
      descripcion: 'Implementamos nuevas funcionalidades de navegación, incluyendo búsqueda avanzada, filtros por categoría y herramientas de medición.',
      fecha: '20 de Diciembre, 2023',
      categoria: 'Mejoras',
      autor: 'Equipo de Desarrollo'
    },
    {
      id: 6,
      titulo: 'Taller de Capacitación GeoPortal',
      descripcion: 'Únete a nuestro taller gratuito de capacitación sobre el uso del GeoPortal. Aprende a aprovechar todas las herramientas disponibles.',
      fecha: '15 de Diciembre, 2023',
      categoria: 'Eventos',
      autor: 'Departamento de Capacitación'
    }
  ];

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
