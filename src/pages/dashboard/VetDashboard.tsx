import { useEffect, useMemo, useState } from 'react';
import { Stethoscope, Syringe, Scissors, FileText, Calendar, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Dog, TreatmentStatus, MedicalRecord } from '@/types';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface VetStats {
  totalPatients: number;
  patientsToday: number;
  vaccinated: number;
  sterilized: number;
  pendingTreatment: number;
  inProgressTreatment: number;
  completedTreatment: number;
}

export default function VetDashboard() {
  const [search, setSearch] = useState('');
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<VetStats>({
    totalPatients: 0,
    patientsToday: 0,
    vaccinated: 0,
    sterilized: 0,
    pendingTreatment: 0,
    inProgressTreatment: 0,
    completedTreatment: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [recordForm, setRecordForm] = useState({
    recordType: 'checkup' as 'vaccination' | 'sterilization' | 'treatment' | 'checkup',
    description: '',
    medications: '',
    nextFollowUp: '',
  });
  const [savingRecord, setSavingRecord] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      // Fetch dogs
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

      // Fetch statistics
      try {
        setLoadingStats(true);
        const statsRes = await fetch(`${API_URL}/dogs/vet-stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats || {
            totalPatients: 0,
            patientsToday: 0,
            vaccinated: 0,
            sterilized: 0,
            pendingTreatment: 0,
            inProgressTreatment: 0,
            completedTreatment: 0,
          });
        }
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching vet stats:', e);
      } finally {
        setLoadingStats(false);
      }

      // Fetch medical records
      try {
        setLoadingRecords(true);
        const recordsRes = await fetch(`${API_URL}/medical-records`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          setMedicalRecords(recordsData.items || []);
        }
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching medical records:', e);
      } finally {
        setLoadingRecords(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchData();
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
      
      // Refresh statistics after updating treatment status
      try {
        const statsRes = await fetch(`${API_URL}/dogs/vet-stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats || stats);
        }
      } catch (e) {
        // Ignore stats refresh errors
      }
      
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

  const statsCards = [
    { label: 'Patients Today', value: stats.patientsToday, icon: Stethoscope, color: 'text-primary' },
    { label: 'Vaccinated', value: stats.vaccinated, icon: Syringe, color: 'text-status-progress' },
    { label: 'Sterilized', value: stats.sterilized, icon: Scissors, color: 'text-status-adoptable' },
    { label: 'Total Patients', value: stats.totalPatients, icon: Calendar, color: 'text-status-reported' },
  ];

  const handleAddRecord = async () => {
    if (!selectedDog || !token) return;
    if (!recordForm.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Description is required.',
        variant: 'destructive',
      });
      return;
    }

    setSavingRecord(true);
    try {
      const res = await fetch(`${API_URL}/medical-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dogId: selectedDog,
          recordType: recordForm.recordType,
          description: recordForm.description.trim(),
          medications: recordForm.medications.trim() || undefined,
          nextFollowUp: recordForm.nextFollowUp || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to save medical record');
      }

      const data = await res.json();
      setMedicalRecords((prev) => [data.item, ...prev]);
      
      // Refresh dogs to update vaccinated/sterilized status
      const dogsRes = await fetch(`${API_URL}/dogs/for-vet`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (dogsRes.ok) {
        const dogsData = await dogsRes.json();
        setDogs(dogsData.items || []);
      }

      // Refresh stats
      const statsRes = await fetch(`${API_URL}/dogs/vet-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || stats);
      }

      toast({
        title: 'Record saved!',
        description: 'Medical record has been added successfully.',
      });
      
      setRecordForm({
        recordType: 'checkup',
        description: '',
        medications: '',
        nextFollowUp: '',
      });
      setSelectedDog(null);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to save medical record',
        variant: 'destructive',
      });
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Veterinarian Dashboard</h1>
        <p className="text-muted-foreground">Manage medical records for rescued dogs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label}>
              <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
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
          <CardTitle className="text-lg">Patients</CardTitle>
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
              No dogs found. Adjust your search or check back later.
            </p>
          ) : (
            <div className="space-y-3">
            {patients.map((dog) => {
              const dogRecords = medicalRecords.filter(r => r.dogId === dog.id);
              const lastRecord = dogRecords[dogRecords.length - 1];
              
              return (
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

                    <div className="text-right hidden sm:block">
                    {lastRecord && (
                      <div className="text-xs text-muted-foreground mb-2">
                        Last visit: {new Date(lastRecord.date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {dogRecords.length} records
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="hidden sm:block">
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          History
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Medical History - {dog.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {loadingRecords ? (
                            <div className="flex items-center justify-center py-8">
                              <Spinner size="lg" />
                            </div>
                          ) : dogRecords.length > 0 ? (
                            dogRecords.map((record) => (
                              <div key={record.id} className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium capitalize">{record.type}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(record.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{record.description}</p>
                                {record.medications && record.medications.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {record.medications.map((med, i) => (
                                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        {med}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {record.nextFollowUp && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Next follow-up: {new Date(record.nextFollowUp).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No medical records yet</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          className="btn-hero-primary"
                          onClick={() => {
                            setSelectedDog(dog.id);
                            setRecordForm({
                              recordType: 'checkup',
                              description: '',
                              medications: '',
                              nextFollowUp: '',
                            });
                          }}
                        >
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Add Record
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Medical Record - {dog.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Record Type</Label>
                            <Select
                              value={recordForm.recordType}
                              onValueChange={(value) => setRecordForm({ ...recordForm, recordType: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vaccination">Vaccination</SelectItem>
                                <SelectItem value="sterilization">Sterilization</SelectItem>
                                <SelectItem value="treatment">Treatment</SelectItem>
                                <SelectItem value="checkup">General Checkup</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Description *</Label>
                            <Textarea 
                              placeholder="Describe the procedure or treatment..."
                              rows={3}
                              value={recordForm.description}
                              onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Medications (comma separated)</Label>
                            <Input 
                              placeholder="e.g., Rabies Vaccine, Deworming" 
                              value={recordForm.medications}
                              onChange={(e) => setRecordForm({ ...recordForm, medications: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Next Follow-up (optional)</Label>
                            <Input 
                              type="date" 
                              value={recordForm.nextFollowUp}
                              onChange={(e) => setRecordForm({ ...recordForm, nextFollowUp: e.target.value })}
                            />
                          </div>

                          <Button 
                            className="w-full btn-hero-primary" 
                            onClick={handleAddRecord}
                            disabled={savingRecord}
                          >
                            {savingRecord && <Spinner size="sm" className="mr-2" />}
                            {savingRecord ? 'Saving...' : 'Save Medical Record'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
