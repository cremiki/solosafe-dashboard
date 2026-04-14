const geocodeCache: Record<string, string> = {};

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache[key]) return geocodeCache[key];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`,
      { headers: { 'User-Agent': 'SoloSafe Dashboard/1.0' } }
    );
    const data = await res.json();
    const a = data.address;
    const road = a.road || a.pedestrian || a.path || '';
    const num = a.house_number ? ` ${a.house_number}` : '';
    const cap = a.postcode || '';
    const city = a.city || a.town || a.village || a.municipality || '';
    const prov = a.county || a.state_district || '';
    const result = `${road}${num}, ${cap} ${city} (${prov})`.trim();
    geocodeCache[key] = result || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    geocodeCache[key] = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  return geocodeCache[key];
}
