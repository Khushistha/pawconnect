import { useEffect, useState } from 'react';
import { FileText, Stethoscope, Search, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { MedicalRecord, Dog } from '@/types';
import { Spinner, ButtonSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VetMedicalRecordsPage() {
  const [search, setSearch] = useState('');
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    dogId: '',
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
      
      // Fetch medical records
      try {
        setLoading(true);
        setError(null);
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
        setError(e.message || 'Failed to load medical records');
      }

      // Fetch dogs to populate dropdown
      try {
        const dogsRes = await fetch(`${API_URL}/dogs/for-vet`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (dogsRes.ok) {
          const dogsData = await dogsRes.json();
          setDogs(dogsData.items || []);
        }
      } catch (e: any) {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchData();
  }, [token]);

  const handleAddRecord = async () => {
    if (!token) return;
    if (!recordForm.dogId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a patient.',
        variant: 'destructive',
      });
      return;
    }
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
          dogId: recordForm.dogId,
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
      
      toast({
        title: 'Record saved!',
        description: 'Medical record has been added successfully.',
      });
      
      setRecordForm({
        dogId: '',
        recordType: 'checkup',
        description: '',
        medications: '',
        nextFollowUp: '',
      });
      setIsDialogOpen(false);
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

  const filteredRecords = medicalRecords.filter((record) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      record.dogName?.toLowerCase().includes(term) ||
      record.description.toLowerCase().includes(term) ||
      record.type.toLowerCase().includes(term)
    );
  });

  const dogById = dogs.reduce((acc, dog) => {
    acc[dog.id] = dog;
    return acc;
  }, {} as Record<string, Dog>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground">View and manage medical records for your patients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Medical Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Patient *</Label>
                <Select
                  value={recordForm.dogId}
                  onValueChange={(value) => setRecordForm({ ...recordForm, dogId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {dogs.map((dog) => (
                      <SelectItem key={dog.id} value={dog.id}>
                        {dog.name} {dog.breed ? `(${dog.breed})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Record Type *</Label>
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
                className="w-full" 
                onClick={handleAddRecord}
                disabled={savingRecord}
              >
                {savingRecord && <ButtonSpinner />}
                {savingRecord ? 'Saving...' : 'Save Medical Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient name, description, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Medical Records List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Medical Records</CardTitle>
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
          ) : filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? 'No records match your search.' : 'No medical records yet. Add your first record above.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div 
                  key={record.id}
                  className="p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Stethoscope className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-semibold">{record.dogName || 'Unknown Patient'}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {record.type} • {new Date(record.date).toLocaleDateString()}
                      </span>
                    </div>
                    {dogById[record.dogId] && (
                      <img 
                        src={dogById[record.dogId].photos[0] || '/placeholder.svg'} 
                        alt={record.dogName}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{record.description}</p>
                  
                  {record.medications && record.medications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {record.medications.map((med, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {med}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {record.nextFollowUp && (
                    <p className="text-xs text-muted-foreground">
                      Next follow-up: {new Date(record.nextFollowUp).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
