export interface LatLng {
  lat: number;
  lng: number;
}

// Ray-casting algorithm: odd = inside, even = outside
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = (yi > point.lng) !== (yj > point.lng) &&
      point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Center of a polygon (simple centroid)
export function polygonCenter(polygon: LatLng[]): LatLng {
  const n = polygon.length;
  if (n === 0) return { lat: 0, lng: 0 };
  const sum = polygon.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / n, lng: sum.lng / n };
}
