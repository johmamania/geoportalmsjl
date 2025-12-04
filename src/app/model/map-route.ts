export interface MapRoute {
  id?: string;
  name: string;
  description?: string;
  coordinates: number[][]; // [[lng, lat], [lng, lat], ...]
  stroke_color?: string;
  stroke_width?: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  is_active?: boolean;
}

export interface MapRouteCreate {
  name: string;
  description?: string;
  coordinates: number[][];
  stroke_color?: string;
  stroke_width?: number;
  category?: string;
}

