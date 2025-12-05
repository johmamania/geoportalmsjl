import { Component } from '@angular/core';
import { MaterialModule } from '../material/material.module';
import { environment } from '../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { LoginComponent } from '../login/login.component';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.css'
})
export class PrincipalComponent {
  version: string;
  year = new Date().getFullYear();

  categorias = this.categoriasService.getCategorias();

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private categoriasService: CategoriasService
  ) {

    this.version = environment.VERSION;
  }


  login() {
    this.dialog.open(LoginComponent, {

      disableClose: false,
      autoFocus: true
    });
  }



verUbicaciones(id: string) {
  this.router.navigate(['/geoportal', id]);
}
















  getIconForCategory(id: string): string {
    return this.categoriasService.getIconForCategory(id);
  }
}
