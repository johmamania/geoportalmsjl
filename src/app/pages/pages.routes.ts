import { Routes } from '@angular/router';
import { certGuard } from '../guard/cert.guard';
import { Not403Component } from './not403/not403.component';



export const pagesRoutes: Routes = [
  //{ path: 'inicio', component: DashboardComponent, canActivate: [certGuard] },




  { path: 'not-403', component: Not403Component },


];
