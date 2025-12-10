import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material.module';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-not403',
  standalone: true,
  imports: [RouterLink, MaterialModule, CommonModule],
  templateUrl: './not403.component.html',
  styleUrl: './not403.component.css'
})
export class Not403Component implements OnInit {

  username: string = '';
  isAuthenticated: boolean = false;

  constructor(private authService: AdminAuthService) {}

  ngOnInit(): void {
    // Verificar si hay una sesión activa
    this.isAuthenticated = this.authService.getIsAuthenticated();
    
    if (this.isAuthenticated) {
      // Intentar obtener el username si está autenticado
      try {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
          // Aquí podrías decodificar el token si es necesario
          // Por ahora, usamos un valor por defecto
          this.username = 'Usuario';
        }
      } catch (error) {
        console.error('Error al obtener username:', error);
      }
    }
  }

}
