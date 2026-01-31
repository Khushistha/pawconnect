import { useState } from 'react';
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
import { mockDogs, mockMedicalRecords } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export default function VetDashboard() {
  const [search, setSearch] = useState('');
  const [selectedDog, setSelectedDog] = useState<string | null>(null);
  const { toast } = useToast();

  // Dogs that need medical attention (not adopted)
  const patients = mockDogs.filter(d => 
    d.status !== 'adopted' && 
    (d.name.toLowerCase().includes(search.toLowerCase()) || 
     d.breed?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label: 'Patients Today', value: 5, icon: Stethoscope, color: 'text-primary' },
    { label: 'Vaccinations', value: 12, icon: Syringe, color: 'text-status-progress' },
    { label: 'Sterilizations', value: 8, icon: Scissors, color: 'text-status-adoptable' },
    { label: 'Follow-ups Due', value: 3, icon: Calendar, color: 'text-status-reported' },
  ];

  const handleAddRecord = () => {
    toast({
      title: 'Record saved!',
      description: 'Medical record has been added successfully.',
    });
    setSelectedDog(null);
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
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
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
          <div className="space-y-3">
            {patients.map((dog) => {
              const dogRecords = mockMedicalRecords.filter(r => r.dogId === dog.id);
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
                          {dogRecords.length > 0 ? dogRecords.map((record) => (
                            <div key={record.id} className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize">{record.type}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(record.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{record.description}</p>
                              {record.medications && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {record.medications.map((med, i) => (
                                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      {med}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )) : (
                            <p className="text-muted-foreground text-center py-4">No medical records yet</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="btn-hero-primary">
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
                            <Select>
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
                            <Label>Description</Label>
                            <Textarea 
                              placeholder="Describe the procedure or treatment..."
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Medications (comma separated)</Label>
                            <Input placeholder="e.g., Rabies Vaccine, Deworming" />
                          </div>

                          <div className="space-y-2">
                            <Label>Next Follow-up (optional)</Label>
                            <Input type="date" />
                          </div>

                          <Button className="w-full btn-hero-primary" onClick={handleAddRecord}>
                            Save Medical Record
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
