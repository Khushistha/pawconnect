import { useState } from 'react';
import { MapPin, ZoomIn, ZoomOut, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Location } from '@/types';

interface MockMapProps {
  center?: Location;
  markers?: Array<{ id: string; location: Location; label?: string; type?: 'rescue' | 'dog' }>;
  onLocationSelect?: (location: Location) => void;
  selectable?: boolean;
  className?: string;
}

export function MockMap({ 
  center = { lat: 27.7172, lng: 85.3240, address: 'Kathmandu, Nepal' },
  markers = [],
  onLocationSelect,
  selectable = false,
  className 
}: MockMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [zoom, setZoom] = useState(12);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectable) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.1;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.1;
    
    const newLocation: Location = {
      lat: center.lat + y,
      lng: center.lng + x,
      address: 'Selected Location, Nepal',
    };
    
    setSelectedLocation(newLocation);
    onLocationSelect?.(newLocation);
  };

  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-muted', className)}>
      {/* Map Background - Styled representation */}
      <div 
        className="w-full h-full min-h-[300px] relative cursor-crosshair"
        onClick={handleMapClick}
        style={{
          background: `
            radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, hsl(var(--accent) / 0.1) 0%, transparent 50%),
            linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)
          `,
        }}
      >
        {/* Grid lines to simulate map */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="text-primary">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Center marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-primary/20 rounded-full animate-ping" />
        </div>

        {/* Markers */}
        {markers.map((marker, index) => (
          <div
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{
              top: `${30 + (index * 15) % 40}%`,
              left: `${20 + (index * 20) % 60}%`,
            }}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shadow-lg',
              marker.type === 'rescue' ? 'bg-secondary' : 'bg-primary'
            )}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            {marker.label && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-card rounded text-xs font-medium whitespace-nowrap shadow">
                {marker.label}
              </div>
            )}
          </div>
        ))}

        {/* Selected location marker */}
        {selectedLocation && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10">
            <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center shadow-lg animate-bounce">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        {/* Map Label */}
        <div className="absolute bottom-4 left-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 shadow">
          <p className="text-sm font-medium">{center.address}</p>
          <p className="text-xs text-muted-foreground">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </p>
          {selectable && (
            <p className="text-xs text-primary mt-1">Click on map to select location</p>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="w-8 h-8 shadow"
          onClick={() => setZoom(Math.min(zoom + 1, 18))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="w-8 h-8 shadow"
          onClick={() => setZoom(Math.max(zoom - 1, 5))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="w-8 h-8 shadow"
          onClick={() => {
            setSelectedLocation(center);
            onLocationSelect?.(center);
          }}
        >
          <Locate className="w-4 h-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium shadow">
        Zoom: {zoom}x
      </div>
    </div>
  );
}
