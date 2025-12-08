import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { Not404Component } from './pages/not404/not404.component';

import { LayoutComponent } from './pages/layout/layout.component';


export const routes: Routes = [

  {
    path: '',
    component: LayoutComponent,
    loadChildren: () =>
      import('./pages/pages.routes').then((x) => x.pagesRoutes),
  },
  { path: 'not-404', component: Not404Component},
  { path: '**', redirectTo: 'not-404'}



];


