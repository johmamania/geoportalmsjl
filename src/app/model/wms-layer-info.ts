export interface WMSLayerInfo {
  name: string;
  visible: boolean;
  opacity: number;
}

export interface WMSLayerConfig {
  name: string;
  displayName: string;
  url: string;
  layerName: string;
  opacity?: number;
  category?: string;
}

