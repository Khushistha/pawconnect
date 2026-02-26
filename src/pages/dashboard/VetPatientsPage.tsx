import { useEffect, useMemo, useState } from 'react';
import { Stethoscope, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Dog, TreatmentStatus } from '@/types';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VetPatientsPage() {
  const [search, setSearch] = useState('');
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { token } = useAuth();

  useEffect(() => {
    const fetchDogs = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/dogs/for-vet`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message || 'Failed to fetch dogs');
        }
        const data = await res.json();
        const items: Dog[] = data.items || [];
        setDogs(items);
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching dogs for vet dashboard:', e);
        setError(e.message || 'Failed to load dogs');
        setDogs([]);
      } finally {
        setLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchDogs();
  }, [token]);

  const updateTreatmentStatus = async (dogId: string, status: TreatmentStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/dogs/${dogId}/treatment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ treatmentStatus: status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to update treatment status');
      }
      const data = await res.json();
      const updated: Dog = data.item;
      setDogs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      
      toast({
        title: 'Treatment status updated',
        description: `Status set to ${status.replace('_', ' ')}.`,
      });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to update treatment status',
        variant: 'destructive',
      });
    }
  };

  // Dogs that need medical attention (not adopted)
  const patients = useMemo(
    () =>
      dogs.filter((d) => {
        if (d.status === 'adopted') return false;
        if (!search) return true;
        const term = search.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(term);
        const matchesBreed = d.breed?.toLowerCase().includes(term);
        return matchesName || matchesBreed;
      }),
    [dogs, search]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">Manage your assigned patients</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name or breed..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Patients List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">My Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : patients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No patients assigned. Check back later.
            </p>
          ) : (
            <div className="space-y-3">
              {patients.map((dog) => (
                <div 
                  key={dog.id}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                >
                  <img 
                    src={dog.photos[0] || '/placeholder.svg'} 
                    alt={dog.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{dog.name}</h3>
                      <StatusBadge status={dog.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {dog.breed || 'Mixed Breed'} • {dog.estimatedAge} • {dog.gender}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className={dog.vaccinated ? 'text-status-treated' : ''}>
                        {dog.vaccinated ? '✓ Vaccinated' : '○ Not vaccinated'}
                      </span>
                      <span className={dog.sterilized ? 'text-status-treated' : ''}>
                        {dog.sterilized ? '✓ Sterilized' : '○ Not sterilized'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div>
                      <Label className="text-xs mb-1 block">Treatment</Label>
                      <Select
                        value={dog.treatmentStatus ?? 'pending'}
                        onValueChange={(value) =>
                          updateTreatmentStatus(dog.id, value as TreatmentStatus)
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
