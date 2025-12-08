
import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { InicioComponent } from './inicio/inicio.component';
import { GeoportalComponent } from './geoportal/geoportal.component';
import { PublicacionesComponent } from './publicaciones/publicaciones.component';
import { ContactanosComponent } from './contactanos/contactanos.component';
import { LoginComponent } from '../login/login.component';
import { AdminComponent } from './admin/admin.component';
import { adminGuard } from '../guard/admin.guard';


export const pagesRoutes: Routes = [

  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: InicioComponent },
      { path: 'geoportal', component: GeoportalComponent },
      { path: 'geoportal/:id', component: GeoportalComponent },
      { path: 'publicaciones', component: PublicacionesComponent },
      { path: 'contactanos', component: ContactanosComponent },
    ]
  },
  {
    path: 'admin/login',
    component: LoginComponent,
  },
  {
    path: 'admin/admin-map',
    component: AdminComponent,
    canActivate: [adminGuard]
  },


];
