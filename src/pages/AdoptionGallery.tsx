import { useState, useEffect, useMemo } from 'react';
import { PawPrint } from 'lucide-react';
import { DogCard } from '@/components/dogs/DogCard';
import { DogFilters, DogFiltersState } from '@/components/dogs/DogFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/spinner';
import type { Dog } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const initialFilters: DogFiltersState = {
  search: '',
  size: 'all',
  gender: 'all',
  vaccinated: false,
  sterilized: false,
};

export default function AdoptionGallery() {
  const [filters, setFilters] = useState<DogFiltersState>(initialFilters);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/dogs?status=adoptable`);
        if (!response.ok) throw new Error('Failed to fetch dogs');
        const data = await response.json();
        setDogs(data.items || []);
      } catch (err: any) {
        console.error('Error fetching dogs:', err);
        setError(err.message || 'Failed to load dogs');
        setDogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDogs();
  }, []);

  const adoptableDogs = useMemo(() => {
    return dogs.filter(dog => {
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
  }, [dogs, filters]);

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
        {!loading && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{adoptableDogs.length}</span> dog{adoptableDogs.length !== 1 ? 's' : ''} available for adoption
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Dogs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : adoptableDogs.length > 0 ? (
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
            description={filters.search || filters.size !== 'all' || filters.gender !== 'all' || filters.vaccinated || filters.sterilized
              ? "Try adjusting your filters to find more dogs available for adoption."
              : "No dogs are currently available for adoption. Check back soon!"}
            actionLabel={filters.search || filters.size !== 'all' || filters.gender !== 'all' || filters.vaccinated || filters.sterilized ? "Clear Filters" : undefined}
            onAction={filters.search || filters.size !== 'all' || filters.gender !== 'all' || filters.vaccinated || filters.sterilized ? () => setFilters(initialFilters) : undefined}
          />
        )}
      </div>
    </div>
  );
}
