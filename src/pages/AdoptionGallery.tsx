import { useState, useMemo } from 'react';
import { PawPrint } from 'lucide-react';
import { DogCard } from '@/components/dogs/DogCard';
import { DogFilters, DogFiltersState } from '@/components/dogs/DogFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { mockDogs } from '@/data/mockData';

const initialFilters: DogFiltersState = {
  search: '',
  size: 'all',
  gender: 'all',
  vaccinated: false,
  sterilized: false,
};

export default function AdoptionGallery() {
  const [filters, setFilters] = useState<DogFiltersState>(initialFilters);

  const adoptableDogs = useMemo(() => {
    return mockDogs
      .filter(dog => dog.status === 'adoptable')
      .filter(dog => {
        // Search filter
        if (filters.search) {
          const search = filters.search.toLowerCase();
          const matchesName = dog.name.toLowerCase().includes(search);
          const matchesBreed = dog.breed?.toLowerCase().includes(search);
          if (!matchesName && !matchesBreed) return false;
        }

        // Size filter
        if (filters.size !== 'all' && dog.size !== filters.size) return false;

        // Gender filter
        if (filters.gender !== 'all' && dog.gender !== filters.gender) return false;

        // Vaccinated filter
        if (filters.vaccinated && !dog.vaccinated) return false;

        // Sterilized filter
        if (filters.sterilized && !dog.sterilized) return false;

        return true;
      });
  }, [filters]);

  return (
    <div className="min-h-screen py-8 lg:py-12">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Find Your Perfect Companion
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse our wonderful dogs ready for adoption. Each one has been rescued, 
            rehabilitated, and is waiting for their forever home.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <DogFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => setFilters(initialFilters)}
          />
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{adoptableDogs.length}</span> dogs available for adoption
          </p>
        </div>

        {/* Dogs Grid */}
        {adoptableDogs.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {adoptableDogs.map((dog, index) => (
              <div 
                key={dog.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <DogCard dog={dog} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PawPrint}
            title="No dogs found"
            description="Try adjusting your filters to find more dogs available for adoption."
            actionLabel="Clear Filters"
            onAction={() => setFilters(initialFilters)}
          />
        )}
      </div>
    </div>
  );
}
