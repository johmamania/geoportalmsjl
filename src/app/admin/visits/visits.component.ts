import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="visits-container">
      <h2>Cantidad de Visitas</h2>
      <p>Aquí se mostrará la información de visitas a las ubicaciones.</p>
      <!-- Contenido del componente de visitas -->
    </div>
  `,
  styles: [`
    .visits-container {
      padding: 24px;
    }
    h2 {
      color: #1e3c72;
      margin-bottom: 16px;
    }
  `]
})
export class VisitsComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Lógica para cargar datos de visitas
  }
}

