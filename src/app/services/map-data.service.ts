import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { MapPoint, MapPointCreate, MapPointUpdate } from '../model/map-point';
import { MapRoute, MapRouteCreate } from '../model/map-route';
import { MapPolygon, MapPolygonCreate } from '../model/map-polygon';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {
  private supabaseUrl = environment.supabase.url;
  private supabaseKey = environment.supabase.anonKey;
  private headers = new HttpHeaders({
    'apikey': this.supabaseKey,
    'Authorization': `Bearer ${this.supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  });

  // Signals para reactividad
  points = signal<MapPoint[]>([]);
  routes = signal<MapRoute[]>([]);
  polygons = signal<MapPolygon[]>([]);

  constructor(private http: HttpClient) {
    this.loadAllData();
  }


  /**
   * Obtiene todos los puntos activos
   */
  getPoints(): Observable<MapPoint[]> {
    const url = `${this.supabaseUrl}/rest/v1/meeting_points?select=*`;

    return this.http.get<MapPoint[]>(url, { headers: this.headers }).pipe(
      map(points => {
        this.points.set(points);
        return points;
      }),
      catchError(error => {
        console.error('Error al obtener puntos:', error);
        return throwError(() => error);
      })
    );
  }

  getPointsSinAutorizacion(): Observable<MapPoint[]> {
    const url = `${this.supabaseUrl}/rest/v1/meeting_points?select=*&is_active=eq.true&order=created_at.desc`;

    // Headers mínimos sin autenticación (solo apikey público)
    const publicHeaders = new HttpHeaders({
      'apikey': this.supabaseKey,
      'Content-Type': 'application/json'
    });

    return this.http.get<MapPoint[]>(url, { headers: publicHeaders }).pipe(
      map(points => {
        if (points && Array.isArray(points)) {
          this.points.set(points);
          return points;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al obtener puntos sin autorización:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene un punto por ID
   */
  getPointById(id: string): Observable<MapPoint> {
    const url = `${this.supabaseUrl}/rest/v1/meeting_points?id=eq.${id}&select=*`;
    return this.http.get<MapPoint[]>(url, { headers: this.headers }).pipe(
      map(points => points[0]),
      catchError(error => {
        console.error('Error al obtener punto:', error);
        return throwError(() => error);
      })
    );
  }


  /**
   * Crea un nuevo punto
   */
  createPoint(point: MapPointCreate): Observable<MapPoint> {
    const url = `${this.supabaseUrl}/rest/v1/meeting_points`;
    return this.http.post<MapPoint[]>(url, point, { headers: this.headers }).pipe(
      map(points => {
        const newPoint = points[0];
        this.points.update(current => [newPoint, ...current]);
        return newPoint;
      }),
      catchError(error => {
        console.error('Error al crear punto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Actualiza un punto existente
   */
  updatePoint(id: string, point: MapPointUpdate): Observable<MapPoint> {
    const url = `${this.supabaseUrl}/rest/v1/meeting_points?id=eq.${id}`;
    return this.http.patch<MapPoint[]>(url, point, { headers: this.headers }).pipe(
      map(points => {
        const updatedPoint = points[0];
        this.points.update(current =>
          current.map(p => p.id === id ? updatedPoint : p)
        );
        return updatedPoint;
      }),
      catchError(error => {
        console.error('Error al actualizar punto:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina un punto (soft delete)
   */
  deletePoint(id: string): Observable<void> {
    const url = `${this.supabaseUrl}/rest/v1/meeting_points?id=eq.${id}`;
    return this.http.patch<MapPoint[]>(url, { is_active: false }, { headers: this.headers }).pipe(
      map(() => {
        this.points.update(current => current.filter(p => p.id !== id));
      }),
      catchError(error => {
        console.error('Error al eliminar punto:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // CRUD PARA RUTAS
  // ============================================

  getRoutes(): Observable<MapRoute[]> {
    const url = `${this.supabaseUrl}/rest/v1/map_routes?is_active=eq.true&select=*&order=created_at.desc`;
    return this.http.get<MapRoute[]>(url, { headers: this.headers }).pipe(
      map(routes => {
        this.routes.set(routes);
        return routes;
      }),
      catchError(error => {
        console.error('Error al obtener rutas:', error);
        return throwError(() => error);
      })
    );
  }

  createRoute(route: MapRouteCreate): Observable<MapRoute> {
    const url = `${this.supabaseUrl}/rest/v1/map_routes`;
    return this.http.post<MapRoute[]>(url, route, { headers: this.headers }).pipe(
      map(routes => {
        const newRoute = routes[0];
        this.routes.update(current => [newRoute, ...current]);
        return newRoute;
      }),
      catchError(error => {
        console.error('Error al crear ruta:', error);
        return throwError(() => error);
      })
    );
  }

  updateRoute(id: string, route: Partial<MapRouteCreate>): Observable<MapRoute> {
    const url = `${this.supabaseUrl}/rest/v1/map_routes?id=eq.${id}`;
    return this.http.patch<MapRoute[]>(url, route, { headers: this.headers }).pipe(
      map(routes => {
        const updatedRoute = routes[0];
        this.routes.update(current =>
          current.map(r => r.id === id ? updatedRoute : r)
        );
        return updatedRoute;
      }),
      catchError(error => {
        console.error('Error al actualizar ruta:', error);
        return throwError(() => error);
      })
    );
  }

  deleteRoute(id: string): Observable<void> {
    const url = `${this.supabaseUrl}/rest/v1/map_routes?id=eq.${id}`;
    return this.http.patch<MapRoute[]>(url, { is_active: false }, { headers: this.headers }).pipe(
      map(() => {
        this.routes.update(current => current.filter(r => r.id !== id));
      }),
      catchError(error => {
        console.error('Error al eliminar ruta:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // CRUD PARA POLÍGONOS
  // ============================================

  getPolygons(): Observable<MapPolygon[]> {
    const url = `${this.supabaseUrl}/rest/v1/map_polygons?is_active=eq.true&select=*&order=created_at.desc`;
    return this.http.get<MapPolygon[]>(url, { headers: this.headers }).pipe(
      map(polygons => {
        this.polygons.set(polygons);
        return polygons;
      }),
      catchError(error => {
        console.error('Error al obtener polígonos:', error);
        return throwError(() => error);
      })
    );
  }

  createPolygon(polygon: MapPolygonCreate): Observable<MapPolygon> {
    const url = `${this.supabaseUrl}/rest/v1/map_polygons`;
    return this.http.post<MapPolygon[]>(url, polygon, { headers: this.headers }).pipe(
      map(polygons => {
        const newPolygon = polygons[0];
        this.polygons.update(current => [newPolygon, ...current]);
        return newPolygon;
      }),
      catchError(error => {
        console.error('Error al crear polígono:', error);
        return throwError(() => error);
      })
    );
  }

  updatePolygon(id: string, polygon: Partial<MapPolygonCreate>): Observable<MapPolygon> {
    const url = `${this.supabaseUrl}/rest/v1/map_polygons?id=eq.${id}`;
    return this.http.patch<MapPolygon[]>(url, polygon, { headers: this.headers }).pipe(
      map(polygons => {
        const updatedPolygon = polygons[0];
        this.polygons.update(current =>
          current.map(p => p.id === id ? updatedPolygon : p)
        );
        return updatedPolygon;
      }),
      catchError(error => {
        console.error('Error al actualizar polígono:', error);
        return throwError(() => error);
      })
    );
  }

  deletePolygon(id: string): Observable<void> {
    const url = `${this.supabaseUrl}/rest/v1/map_polygons?id=eq.${id}`;
    return this.http.patch<MapPolygon[]>(url, { is_active: false }, { headers: this.headers }).pipe(
      map(() => {
        this.polygons.update(current => current.filter(p => p.id !== id));
      }),
      catchError(error => {
        console.error('Error al eliminar polígono:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Carga todos los datos al inicializar
   */
  private loadAllData(): void {
    this.getPoints().subscribe();
    this.getRoutes().subscribe();
    this.getPolygons().subscribe();
  }

  /**
   * Recarga todos los datos
   */
  refreshAll(): void {
    this.loadAllData();
  }
}

