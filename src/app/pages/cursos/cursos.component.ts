import { Component } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import { CursosService, Curso } from '../../services/cursos.service';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './cursos.component.html',
  styleUrl: './cursos.component.css'
})
export class CursosComponent {
  cursos: Curso[] = [];

  constructor(private cursosService: CursosService) {
    this.cursos = this.cursosService.getCursos();
  }

  getCategoriaColor(categoria: string): string {
    return this.cursosService.getCategoriaColor(categoria);
  }
}

