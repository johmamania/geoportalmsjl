import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { Not404Component } from './pages/not404/not404.component';
import { GeoportalComponent } from './geoportal/geoportal.component';
import { AdminComponent } from './admin/admin.component';

import { adminGuard } from './guard/admin.guard';


export const routes: Routes = [
  { path: '', component: GeoportalComponent },
  { path: 'geoportal', component: GeoportalComponent },
  {
    path: 'admin/login',
    component: LoginComponent,
  },


  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [adminGuard]
  },
  
  { path: 'not-404', component: Not404Component},
  { path: '**', redirectTo: 'not-404'}
];


