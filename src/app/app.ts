import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
//import { Login } from './auth/pages/login/login';
@Component({
  selector: 'app-root',
	standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  //protected readonly title = signal('tesoreria-cursos-app');
}
