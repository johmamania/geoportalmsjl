import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

export interface RouteResponse {
  code: string;
  routes: Route[];
  waypoints: Waypoint[];
}

export interface Route {
  geometry: {
    coordinates: [number, number][];
    type: string;
  };
  legs: Leg[];
  distance: number; // en metros
  duration: number; // en segundos
  weight: number;
  weight_name: string;
}

export interface Leg {
  distance: number;
  duration: number;
  steps: any[];
  summary: string;
  weight: number;
}

export interface Waypoint {
  hint: string;
  distance: number;
  name: string;
  location: [number, number];
}

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private baseUrl = 'https://router.project-osrm.org/route/v1';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la ruta entre dos puntos usando OSRM
   * @param origin Coordenadas de origen [longitude, latitude]
   * @param destination Coordenadas de destino [longitude, latitude]
   * @param profile Tipo de perfil: 'driving', 'walking', 'cycling'
   * @returns Observable con la respuesta de la ruta
   */
  getRoute(
    origin: [number, number],
    destination: [number, number],
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Observable<RouteResponse> {
    const url = `${this.baseUrl}/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;
    
    console.log(`🔗 URL OSRM: ${url}`);
    console.log(`📊 Perfil usado: ${profile}`);

    return this.http.get<RouteResponse>(url).pipe(
      map(response => {
        if (response.code === 'Ok' && response.routes && response.routes.length > 0) {
          return response;
        } else {
          throw new Error('No se pudo calcular la ruta');
        }
      }),
      catchError(error => {
        console.error('Error al obtener la ruta:', error);
        return throwError(() => new Error('Error al calcular la ruta. Por favor, intente nuevamente.'));
      })
    );
  }
}

