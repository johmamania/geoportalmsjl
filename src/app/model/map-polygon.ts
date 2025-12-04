export interface MapPolygon {
  id?: string;
  name: string;
  description?: string;
  coordinates: number[][]; // [[lng, lat], [lng, lat], ...]
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  fill_opacity?: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  is_active?: boolean;
}

export interface MapPolygonCreate {
  name: string;
  description?: string;
  coordinates: number[][];
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  fill_opacity?: number;
  category?: string;
}

