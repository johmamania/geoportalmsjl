import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment.development';

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

// Interfaces para OpenRouteService
interface OpenRouteServiceResponse {
  type: string;
  features: OpenRouteFeature[];
  bbox?: number[];
}

interface OpenRouteFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  properties: {
    segments: OpenRouteSegment[];
    summary: {
      distance: number; // en metros
      duration: number; // en segundos
    };
    way_points: number[];
  };
}

interface OpenRouteSegment {
  distance: number;
  duration: number;
  steps: any[];
}

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private osrmBaseUrl = 'https://router.project-osrm.org/route/v1';
  private openRouteServiceBaseUrl = environment.openRouteService?.baseUrl || 'https://api.openrouteservice.org/v2/directions';
  private openRouteServiceApiKey = environment.openRouteService?.apiKey || '';
  private useOpenRouteService = environment.openRouteService?.useOpenRouteService !== false;

  constructor(private http: HttpClient) { }

  /**
   * Convierte el perfil de OSRM al perfil de OpenRouteService
   */
  private mapProfileToOpenRouteService(profile: 'driving' | 'walking' | 'cycling'): string {
    const profileMap: { [key: string]: string } = {
      'driving': 'driving-car',
      'walking': 'foot-walking',
      'cycling': 'cycling-regular'
    };
    return profileMap[profile] || 'driving-car';
  }

  /**
   * Convierte la respuesta de OpenRouteService (GeoJSON) al formato RouteResponse
   */
  private convertOpenRouteServiceToRouteResponse(response: OpenRouteServiceResponse, origin: [number, number], destination: [number, number]): RouteResponse {
    if (!response.features || response.features.length === 0) {
      throw new Error('No se encontraron rutas en la respuesta');
    }

    const feature = response.features[0];
    const summary = feature.properties.summary;

    // Convertir coordenadas de GeoJSON [lon, lat] al formato esperado
    const coordinates = feature.geometry.coordinates.map(coord => [coord[0], coord[1]] as [number, number]);

    const route: Route = {
      geometry: {
        coordinates: coordinates,
        type: feature.geometry.type
      },
      legs: feature.properties.segments.map(segment => ({
        distance: segment.distance,
        duration: segment.duration,
        steps: segment.steps || [],
        summary: '',
        weight: segment.duration
      })),
      distance: summary.distance,
      duration: summary.duration,
      weight: summary.duration,
      weight_name: 'duration'
    };

    return {
      code: 'Ok',
      routes: [route],
      waypoints: [
        {
          hint: '',
          distance: 0,
          name: 'Origen',
          location: origin
        },
        {
          hint: '',
          distance: summary.distance,
          name: 'Destino',
          location: destination
        }
      ]
    };
  }

  /**
   * Obtiene la ruta usando OpenRouteService
   */
  private getRouteFromOpenRouteService(
    origin: [number, number],
    destination: [number, number],
    profile: 'driving' | 'walking' | 'cycling'
  ): Observable<RouteResponse> {
    const orsProfile = this.mapProfileToOpenRouteService(profile);
    const url = `${this.openRouteServiceBaseUrl}/${orsProfile}`;

    // Formato: start=lon,lat&end=lon,lat
    const params = new URLSearchParams({
      api_key: this.openRouteServiceApiKey,
      start: `${origin[0]},${origin[1]}`,
      end: `${destination[0]},${destination[1]}`
    });

    const fullUrl = `${url}?${params.toString()}`;

    console.log(`🔗 URL OpenRouteService: ${fullUrl.replace(this.openRouteServiceApiKey, 'API_KEY_HIDDEN')}`);
    console.log(`📊 Perfil usado: ${profile} -> ${orsProfile}`);

    const headers = new HttpHeaders({
      'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
    });

    return this.http.get<OpenRouteServiceResponse>(fullUrl, { headers }).pipe(
      map(response => {
        return this.convertOpenRouteServiceToRouteResponse(response, origin, destination);
      }),
      catchError(error => {
        console.error('Error al obtener la ruta de OpenRouteService:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene la ruta usando OSRM (fallback)
   */
  private getRouteFromOSRM(
    origin: [number, number],
    destination: [number, number],
    profile: 'driving' | 'walking' | 'cycling'
  ): Observable<RouteResponse> {
    const url = `${this.osrmBaseUrl}/${profile}/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`;

    console.log(`🔗 URL OSRM (fallback): ${url}`);
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
        console.error('Error al obtener la ruta de OSRM:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene la ruta entre dos puntos
   * Primero intenta con OpenRouteService, si falla usa OSRM como fallback
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
    // Si está configurado para usar OpenRouteService y tiene API key
    if (this.useOpenRouteService && this.openRouteServiceApiKey) {
      return this.getRouteFromOpenRouteService(origin, destination, profile).pipe(
        catchError(error => {
          console.warn('⚠️ OpenRouteService falló, usando OSRM como fallback');
          return this.getRouteFromOSRM(origin, destination, profile);
        })
      );
    } else {
      // Usar OSRM directamente
      console.log('ℹ️ Usando OSRM (OpenRouteService no configurado o deshabilitado)');
      return this.getRouteFromOSRM(origin, destination, profile);
    }
  }
}

