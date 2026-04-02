import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, firstValueFrom } from 'rxjs';

// Definimos la estructura para tener autocompletado en todo el proyecto
export interface ComunaChile {
  nombre: string;
  region: string;
}

const DEBUG = true;

@Injectable({
  providedIn: 'root',	
})
export class LocationService {

	private http = inject(HttpClient); // Uso de inject en lugar de constructor
  private jsonUrl = './assets/data/comunas-chile.json'; 

	constructor() { if (DEBUG) console.log('📍 LocationService initialized'); }

  /**
   * Obtiene el listado de comunas de Chile desde un archivo JSON local.
   *
   * @returns {Promise<ComunaChile[]>} Arreglo de comunas.
   * @throws {Error} Si ocurre un error al cargar el archivo.
   */
  getComunas(): Observable<ComunaChile[]> {
    return this.http.get<ComunaChile[]>(this.jsonUrl);
  }

  
}
