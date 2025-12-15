import { Component } from '@angular/core';
import { MaterialModule } from '../../material/material.module';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface ContactoInfo {
  icon: string;
  titulo: string;
  contenido: string;
  accion?: string;
}

@Component({
  selector: 'app-contactanos',
  standalone: true,
  imports: [MaterialModule, CommonModule, FooterComponent],
  templateUrl: './contactanos.component.html',
  styleUrl: './contactanos.component.css'
})
export class ContactanosComponent {
  contactoForm: FormGroup;

  contactos: ContactoInfo[] = [
    {
      icon: 'location_on',
      titulo: 'Dirección',
      contenido: 'Jr. Los Amautas 180, San Juan de Lurigancho, Lima, Perú',
      accion: 'Ver en mapa'
    },
    {
      icon: 'phone',
      titulo: 'Teléfono',
      contenido: '+51 000 000 000',
      accion: 'Llamar ahora'
    },
    {
      icon: 'email',
      titulo: 'Correo Electrónico',
      contenido: 'contacto@pruebas.com.pe',
      accion: 'Enviar email'
    },
    {
      icon: 'schedule',
      titulo: 'Horario de Atención',
      contenido: 'Lunes a Viernes: 8:00 AM - 5:00 PM\nSábados: 9:00 AM - 1:00 PM',
      accion: ''
    }
  ];

  constructor(private fb: FormBuilder) {
    this.contactoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required]],
      asunto: ['', [Validators.required]],
      mensaje: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.contactoForm.valid) {
      console.log('Formulario enviado:', this.contactoForm.value);
      // Aquí iría la lógica para enviar el formulario
      alert('¡Mensaje enviado con éxito! Nos pondremos en contacto contigo pronto.');
      this.contactoForm.reset();
    } else {
      this.contactoForm.markAllAsTouched();
    }
  }

  getErrorMessage(fieldName: string): string {
    const field = this.contactoForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (field?.hasError('email')) {
      return 'Email inválido';
    }
    if (field?.hasError('minlength')) {
      return `Mínimo ${field.errors?.['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
