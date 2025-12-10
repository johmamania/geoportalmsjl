import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../material/material.module';

@Component({
  selector: 'app-not404',
  standalone: true,
  imports: [RouterLink, MaterialModule],
  templateUrl: './not404.component.html',
  styleUrl: './not404.component.css'
})
export class Not404Component {

}
