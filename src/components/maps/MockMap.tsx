import { useCallback, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { cn } from '@/lib/utils';
import { formatCoordinatesFallback, reverseGeocode } from '@/lib/geocoding';
import type { Location } from '@/types';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icon paths for bundlers like Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MockMapProps {
  center?: Location;
  markers?: Array<{ id: string; location: Location; label?: string; type?: 'rescue' | 'dog' }>;
  onLocationSelect?: (location: Location) => void;
  selectable?: boolean;
  className?: string;
}

function MapClickHandler({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export function MockMap({ 
  center = { lat: 28.2165, lng: 83.9990, address: 'Nayabazar, Pokhara, Nepal' },
  markers = [],
  onLocationSelect,
  selectable = false,
  className 
}: MockMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const resolvePick = useCallback(
    (lat: number, lng: number) => {
      const loading: Location = {
        lat,
        lng,
        address: 'Looking up address…',
      };
      setSelectedLocation(loading);
      setGeocoding(true);
      onLocationSelect?.(loading);

      reverseGeocode(lat, lng)
        .then((res) => {
          const loc: Location = {
            lat,
            lng,
            address: res.address,
            district: res.district,
          };
          setSelectedLocation(loc);
          onLocationSelect?.(loc);
        })
        .catch(() => {
          const loc: Location = {
            lat,
            lng,
            address: formatCoordinatesFallback(lat, lng),
          };
          setSelectedLocation(loc);
          onLocationSelect?.(loc);
        })
        .finally(() => setGeocoding(false));
    },
    [onLocationSelect]
  );

  return (
    <div className={cn('relative w-full min-h-[300px] rounded-lg overflow-hidden', className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        scrollWheelZoom
        className="w-full min-h-[300px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler enabled={selectable} onPick={resolvePick} />

        {markers.map((m) => (
          <Marker key={m.id} position={[m.location.lat, m.location.lng]}>
            {(m.label || m.location.address) && (
              <Popup>
                <div className="space-y-1">
                  {m.label && <p className="text-sm font-medium">{m.label}</p>}
                  {m.location.address && (
                    <p className="text-xs text-muted-foreground">{m.location.address}</p>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}

        {selectable && selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const ll = marker.getLatLng();
                resolvePick(ll.lat, ll.lng);
              },
            }}
          >
            <Popup>Drag to adjust exact spot</Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow">
        <p className="text-sm font-medium line-clamp-2">
          {selectable && selectedLocation
            ? selectedLocation.address
            : center.address}
        </p>
        <p className="text-xs text-muted-foreground">
          {(selectable && selectedLocation ? selectedLocation : center).lat.toFixed(4)},{' '}
          {(selectable && selectedLocation ? selectedLocation : center).lng.toFixed(4)}
        </p>
        {selectable && geocoding && (
          <p className="text-xs text-muted-foreground mt-1">Resolving place name…</p>
        )}
        {selectable && !geocoding && (
          <p className="text-xs text-primary mt-1">
            {selectedLocation
              ? 'Drag the pin to adjust — address updates automatically'
              : 'Click on the map to drop a pin (drag to fine-tune)'}
          </p>
        )}
      </div>
    </div>
  );
}
