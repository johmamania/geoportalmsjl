import { Routes } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { PublicacionesComponent } from './publicaciones/publicaciones.component';
import { ContactanosComponent } from './contactanos/contactanos.component';
import { CursosComponent } from './cursos/cursos.component';
import { AdminComponent } from './admin/admin.component';
import { PruebaGeojsonComponent } from './prueba-geojson/prueba-geojson.component';
import { adminGuard } from '../guard/admin.guard';
import { Not403Component } from './not403/not403.component';
import { LoginComponent } from '../login/login.component';

/**
 * Rutas hijas del LayoutComponent
 * Estas rutas se cargan dentro del LayoutComponent que incluye el toolbar y footer
 */
export const pagesRoutes: Routes = [
  // Redirección de raíz a inicio
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },

  // Ruta de inicio (página principal)
  {
    path: 'inicio',
    component: InicioComponent,
    data: { title: 'Inicio' }
  },

  // Ruta de login
  {
    path: 'login',
    component: LoginComponent,
    data: { title: 'Login' }
  },

  // Ruta del geoportal
  {
    path: 'geoportal',
    component: PruebaGeojsonComponent,
    data: { title: 'Geoportal SJL' }
  },

  // Ruta del geoportal con categoría específica
  {
    path: 'geoportal/:layerId',
    component: PruebaGeojsonComponent,
    data: { title: 'Geoportal SJL' }
  },

  // Ruta de publicaciones
  {
    path: 'publicaciones',
    component: PublicacionesComponent,
    data: { title: 'Publicaciones' }
  },

  // Ruta de cursos
  {
    path: 'cursos',
    component: CursosComponent,
    data: { title: 'Cursos' }
  },

  // Ruta de contáctanos
  {
    path: 'contactanos',
    component: ContactanosComponent,
    data: { title: 'Contáctanos' }
  },

  // Ruta de login
  {
    path: 'login',
    component: LoginComponent,
    data: { title: 'Iniciar Sesión' }
  },





  { path: '403', component: Not403Component },



];
