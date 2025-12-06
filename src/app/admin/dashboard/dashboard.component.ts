import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="dashboard-container">
      <h2>Dashboard</h2>
      <p>Aquí se mostrará el dashboard con estadísticas y gráficos.</p>
      <!-- Contenido del componente de dashboard -->
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
    }
    h2 {
      color: #1e3c72;
      margin-bottom: 16px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    // Lógica para cargar datos del dashboard
  }
}

