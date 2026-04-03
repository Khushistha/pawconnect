/**
 * Reverse geocode via OpenStreetMap Nominatim (free, no API key).
 * @see https://operations.osmfoundation.org/policies/nominatim/
 */

export type ReverseGeocodeResult = {
  address: string;
  district?: string;
};

function districtFromNominatimAddress(addr: Record<string, string> | undefined): string | undefined {
  if (!addr) return undefined;
  return (
    addr.county ||
    addr.city_district ||
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.suburb ||
    addr.state_district ||
    undefined
  );
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
    addressdetails: '1',
  });

  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  const displayName = data.display_name?.trim();
  if (!displayName) {
    throw new Error('No address in response');
  }

  return {
    address: displayName,
    district: districtFromNominatimAddress(data.address),
  };
}

export function formatCoordinatesFallback(lat: number, lng: number): string {
  return `${lat.toFixed(5)}°, ${lng.toFixed(5)}° (set a clearer address below if needed)`;
}
