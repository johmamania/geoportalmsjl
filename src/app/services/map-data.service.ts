import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { MapPoint, MapPointCreate, MapPointUpdate } from '../model/map-point';
import { MapRoute, MapRouteCreate } from '../model/map-route';
import { MapPolygon, MapPolygonCreate } from '../model/map-polygon';
import { environment } from '../../environments/environment.development';

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



  constructor(private http: HttpClient) {
    this.loadAllData();
  }









  private loadAllData(): void {

 
  }

  /**
   * Recarga todos los datos
   */
  refreshAll(): void {
    this.loadAllData();
  }
}

