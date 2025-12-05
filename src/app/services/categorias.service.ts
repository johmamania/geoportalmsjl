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
    { nombre: 'punto de reunion', id: '1' },
    { nombre: 'punto de referencia', id: '2' },
    { nombre: 'punto de interes', id: '3' },
  ];

  constructor() { }

  getCategorias(): Categoria[] {
    return this.categorias;
  }

  getIconForCategory(id: string): string {
    switch(id) {
      case '1':
        return 'group';
      case '2':
        return 'place';
      case '3':
        return 'star';
      default:
        return 'location_on';
    }
  }
}
