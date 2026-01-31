import { Link } from 'react-router-dom';
import { MapPin, Calendar, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Dog } from '@/types';

interface DogCardProps {
  dog: Dog;
  showAdoptButton?: boolean;
}

export function DogCard({ dog, showAdoptButton = true }: DogCardProps) {
  return (
    <Card className="overflow-hidden card-interactive group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={dog.photos[0] || '/placeholder.svg'}
          alt={dog.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <StatusBadge status={dog.status} />
        </div>
        <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
          <Heart className="w-5 h-5 text-muted-foreground hover:text-destructive" />
        </button>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white">{dog.name}</h3>
          <p className="text-white/80 text-sm">{dog.breed || 'Mixed Breed'}</p>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {dog.estimatedAge}
          </span>
          <span className="capitalize">{dog.gender}</span>
          <span className="capitalize">{dog.size}</span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{dog.location.address}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {dog.vaccinated && (
            <span className="px-2 py-0.5 bg-status-treated/10 text-status-treated text-xs rounded-full">
              Vaccinated
            </span>
          )}
          {dog.sterilized && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              Sterilized
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/dogs/${dog.id}`}>View Profile</Link>
          </Button>
          {showAdoptButton && dog.status === 'adoptable' && (
            <Button asChild className="flex-1 btn-hero-primary">
              <Link to={`/adopt/${dog.id}`}>Adopt Me</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
