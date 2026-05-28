/**
 * Helpers for Google Maps Static API tiles.
 *
 * Mercator math: at zoom z and latitude lat, ground resolution is
 *   metersPerPixel = 156543.03392 * cos(lat * π/180) / 2^z
 * (per Google's Web Mercator tile scheme).
 */

export const EARTH_CIRCUMFERENCE_M = 156543.03392;

export type LatLng = { lat: number; lng: number };

export type TileConfig = {
  center: LatLng;
  zoom: number;
  widthPx: number;
  heightPx: number;
  scale: 1 | 2;
};

export function metersPerPixel(lat: number, zoom: number, scale: 1 | 2 = 1): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom) / scale;
}

export function pixelsToFeet(pixels: number, lat: number, zoom: number, scale: 1 | 2 = 1): number {
  const meters = pixels * metersPerPixel(lat, zoom, scale);
  return meters * 3.28084;
}

export function staticMapUrl(cfg: TileConfig, apiKey: string): string {
  const params = new URLSearchParams({
    center: `${cfg.center.lat},${cfg.center.lng}`,
    zoom: String(cfg.zoom),
    size: `${cfg.widthPx}x${cfg.heightPx}`,
    scale: String(cfg.scale),
    maptype: 'satellite',
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
