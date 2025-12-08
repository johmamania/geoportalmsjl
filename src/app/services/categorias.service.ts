import { Injectable } from '@angular/core';

export interface Categoria {
  nombre: string;
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasService {

  categorias: Categoria[] = [
    { nombre: 'Puntos de Reunion', id: '1' },
    { nombre: 'Albergues Temporales', id: '2' },
    { nombre: 'Hidrantes', id: '3' },
    { nombre: 'Puntos de Abastecimiento de agua', id: '4' },
    { nombre: 'Areas de Concentracion de Victimas', id: '5' },
  ];

  constructor() { }

  getCategorias(): Categoria[] {
    return this.categorias;
  }

  getIconForCategory(id: string): string {
    switch(id) {
      case '1': // Puntos de Reunion
        return 'group';
      case '2': // Albergues Temporales
        return 'home';
      case '3': // Hidrantes
        return 'water_drop';
      case '4': // Puntos de Abastecimiento de agua
        return 'local_drink';
      case '5': // Areas de Concentracion de Victimas
        return 'people';
      default:
        return 'location_on';
    }
  }
}
