export interface MapPoint {
  id?: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  icon_type?: string;
  icon_color?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  is_active?: boolean;
}

export interface MapPointCreate {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  icon_type?: string;
  icon_color?: string;
  category?: string;
}

export interface MapPointUpdate {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  icon_type?: string;
  icon_color?: string;
  category?: string;
  is_active?: boolean;
}

