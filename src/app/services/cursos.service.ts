import { Injectable } from '@angular/core';

export interface Curso {
  id: number;
  titulo: string;
  descripcion: string;
  duracion: string;
  nivel: string;
  categoria: string;
  certificado: boolean;
  instructor: string;
  fechaInicio: string;
  imagen?: string;
  precio?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CursosService {

  constructor() { }

  /**
   * Obtiene todos los cursos disponibles
   */
  getCursos(): Curso[] {
    return [
      {
        id: 1,
        titulo: 'Introducción a Sistemas de Información Geográfica',
        descripcion: 'Aprende los conceptos fundamentales de los SIG y cómo utilizarlos para análisis espacial y cartografía digital.',
        duracion: '40 horas',
        nivel: 'Principiante',
        categoria: 'Tecnología',
        certificado: true,
        instructor: 'Ing. Carlos Mendoza',
        fechaInicio: '15 de Marzo, 2024',
        precio: 0
      },
      {
        id: 2,
        titulo: 'Cartografía Digital con QGIS',
        descripcion: 'Curso práctico para crear mapas profesionales utilizando QGIS, desde la importación de datos hasta la publicación.',
        duracion: '60 horas',
        nivel: 'Intermedio',
        categoria: 'Tecnología',
        certificado: true,
        instructor: 'Dra. María González',
        fechaInicio: '20 de Marzo, 2024',
        precio: 150
      },
      {
        id: 3,
        titulo: 'Gestión de Riesgos y Desastres Naturales',
        descripcion: 'Capacitación en identificación, evaluación y gestión de riesgos naturales en el contexto urbano.',
        duracion: '30 horas',
        nivel: 'Intermedio',
        categoria: 'Gestión',
        certificado: true,
        instructor: 'Ing. Roberto Silva',
        fechaInicio: '10 de Abril, 2024',
        precio: 0
      },
      {
        id: 4,
        titulo: 'Análisis Espacial Avanzado',
        descripcion: 'Técnicas avanzadas de análisis espacial, interpolación, análisis de redes y modelado geoespacial.',
        duracion: '50 horas',
        nivel: 'Avanzado',
        categoria: 'Tecnología',
        certificado: true,
        instructor: 'Dr. Luis Ramírez',
        fechaInicio: '5 de Abril, 2024',
        precio: 250
      },
      {
        id: 5,
        titulo: 'Uso de Drones en Cartografía',
        descripcion: 'Aprende a utilizar drones para captura de datos geográficos, procesamiento de imágenes y generación de modelos 3D.',
        duracion: '35 horas',
        nivel: 'Intermedio',
        categoria: 'Tecnología',
        certificado: true,
        instructor: 'Ing. Ana Torres',
        fechaInicio: '25 de Marzo, 2024',
        precio: 200
      },
      {
        id: 6,
        titulo: 'Planificación Urbana y Territorial',
        descripcion: 'Herramientas y metodologías para la planificación urbana sostenible y ordenamiento territorial.',
        duracion: '45 horas',
        nivel: 'Intermedio',
        categoria: 'Planificación',
        certificado: false,
        instructor: 'Arq. Pedro Martínez',
        fechaInicio: '12 de Abril, 2024',
        precio: 180
      },
      {
        id: 7,
        titulo: 'Programación para SIG con Python',
        descripcion: 'Automatiza tareas de SIG utilizando Python, bibliotecas como GeoPandas, Shapely y Folium.',
        duracion: '55 horas',
        nivel: 'Avanzado',
        categoria: 'Programación',
        certificado: true,
        instructor: 'Ing. Jorge Herrera',
        fechaInicio: '8 de Abril, 2024',
        precio: 300
      },
      {
        id: 8,
        titulo: 'Teledetección y Análisis de Imágenes Satelitales',
        descripcion: 'Interpretación y análisis de imágenes satelitales para monitoreo ambiental y análisis territorial.',
        duracion: '48 horas',
        nivel: 'Intermedio',
        categoria: 'Tecnología',
        certificado: true,
        instructor: 'Dra. Carmen López',
        fechaInicio: '18 de Abril, 2024',
        precio: 220
      },
      {
        id: 9,
        titulo: 'Gestión de Bases de Datos Geoespaciales',
        descripcion: 'Administración y consulta de bases de datos espaciales con PostGIS y herramientas de gestión.',
        duracion: '42 horas',
        nivel: 'Intermedio',
        categoria: 'Base de Datos',
        certificado: true,
        instructor: 'Ing. Diego Fernández',
        fechaInicio: '22 de Abril, 2024',
        precio: 190
      },
      {
        id: 10,
        titulo: 'Web Mapping y Desarrollo de Portales Geográficos',
        descripcion: 'Desarrollo de aplicaciones web para visualización de mapas interactivos usando tecnologías modernas.',
        duracion: '65 horas',
        nivel: 'Avanzado',
        categoria: 'Desarrollo Web',
        certificado: true,
        instructor: 'Ing. Sofía Vargas',
        fechaInicio: '28 de Abril, 2024',
        precio: 350
      }
    ];
  }

  /**
   * Obtiene un curso por su ID
   */
  getCursoById(id: number): Curso | undefined {
    return this.getCursos().find(curso => curso.id === id);
  }

  /**
   * Obtiene cursos por categoría
   */
  getCursosByCategoria(categoria: string): Curso[] {
    return this.getCursos().filter(curso => curso.categoria === categoria);
  }

  /**
   * Obtiene el color para una categoría
   */
  getCategoriaColor(categoria: string): string {
    const colores: { [key: string]: string } = {
      'Tecnología': '#4A90E2',
      'Gestión': '#50C878',
      'Planificación': '#FF6B6B',
      'Programación': '#FFA500',
      'Base de Datos': '#9B59B6',
      'Desarrollo Web': '#E74C3C'
    };
    return colores[categoria] || '#6b8e23';
  }
}

