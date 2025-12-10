import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { Not404Component } from './pages/not404/not404.component';
import { Not403Component } from './pages/not403/not403.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { AdminComponent } from './pages/admin/admin.component';
import { adminGuard } from './guard/admin.guard';

export const routes: Routes = [
  // Rutas principales con layout
  {
    path: '',
    component: LayoutComponent,
    loadChildren: () =>
      import('./pages/pages.routes').then((x) => x.pagesRoutes),
  },

  // Rutas de administración (sin layout)
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        component: LoginComponent
      },
      {
        path: 'map',
        component: AdminComponent,
        canActivate: [adminGuard]
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  // Rutas de error
  { path: '403', component: Not403Component },
  { path: '404', component: Not404Component },


  // Ruta comodín - debe ir al final
  { path: '**', redirectTo: '/404' }
];


