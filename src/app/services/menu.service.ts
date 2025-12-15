import { Injectable } from '@angular/core';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
  routerLinkActiveOptions?: any;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {

  constructor() { }

  /**
   * Obtiene los elementos del menú principal
   */
  getMenuItems(): MenuItem[] {
    return [
      {
        label: 'Inicio',
        route: '/inicio',
        icon: 'home',
        exact: true
      },
      {
        label: 'Geoportal SJL',
        route: '/geoportal',
        icon: 'map',
        routerLinkActiveOptions: {
          paths: 'subset',
          queryParams: 'ignored',
          matrixParams: 'ignored',
          fragment: 'ignored'
        }
      },
      {
        label: 'Publicaciones',
        route: '/publicaciones',
        icon: 'library_books'
      },
      {
        label: 'Cursos',
        route: '/cursos',
        icon: 'school'
      },
      {
        label: 'Contactanos',
        route: '/contactanos',
        icon: 'contact_mail'
      },
      {label: 'iniciar sesion',
        route: '/login',
        icon: 'login',
      
      }

    ];
  }

  /**
   * Obtiene un elemento del menú por su ruta
   */
  getMenuItemByRoute(route: string): MenuItem | undefined {
    return this.getMenuItems().find(item => item.route === route);
  }
}

