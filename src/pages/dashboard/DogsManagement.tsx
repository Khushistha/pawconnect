import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, X, Upload, MapPin, RefreshCw, AlertCircle, User, Stethoscope, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MockMap } from '@/components/maps/MockMap';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner, ButtonSpinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Dog, Location, DogStatus, DogGender, DogSize, User as UserType } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface VetSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
}

export default function DogsManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryRescued, setSearchQueryRescued] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [dogToDelete, setDogToDelete] = useState<Dog | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vets, setVets] = useState<VetSummary[]>([]);
  const [loadingVets, setLoadingVets] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assigningDog, setAssigningDog] = useState<Dog | null>(null);
  const [selectedVetId, setSelectedVetId] = useState<string>('none');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [isAdopterDialogOpen, setIsAdopterDialogOpen] = useState(false);
  const [viewingAdopter, setViewingAdopter] = useState<UserType | null>(null);
  const [loadingAdopter, setLoadingAdopter] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    estimatedAge: '',
    gender: 'unknown' as DogGender,
    size: 'medium' as DogSize,
    status: 'reported' as DogStatus,
    description: '',
    rescueStory: '',
    location: { lat: 28.2165, lng: 83.9990, address: 'Nayabazar, Pokhara, Nepal', district: 'Kaski' } as Location,
    vaccinated: false,
    sterilized: false,
    medicalNotes: '',
    photos: [] as string[],
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const fetchDogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/dogs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch dogs');
      const data = await response.json();
      setDogs(data.items || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load dogs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, toast]);

  const fetchVets = useCallback(async () => {
    if (!token) return;
    setLoadingVets(true);
    try {
      const res = await fetch(`${API_URL}/vets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to load veterinarians');
      }
      const data = await res.json();
      setVets(data.items || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load veterinarians.',
        variant: 'destructive',
      });
    } finally {
      setLoadingVets(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchDogs();
      fetchVets();
    }
  }, [token, fetchDogs, fetchVets]);

  const handleCreate = () => {
    setEditingDog(null);
    setFormData({
      name: '',
      breed: '',
      estimatedAge: '',
      gender: 'unknown',
      size: 'medium',
      status: 'reported',
      description: '',
      rescueStory: '',
      location: { lat: 28.2165, lng: 83.9990, address: 'Nayabazar, Pokhara, Nepal', district: 'Kaski' },
      vaccinated: false,
      sterilized: false,
      medicalNotes: '',
      photos: [],
    });
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setIsDialogOpen(true);
  };

  const handleEdit = (dog: Dog) => {
    setEditingDog(dog);
    setFormData({
      name: dog.name,
      breed: dog.breed || '',
      estimatedAge: dog.estimatedAge,
      gender: dog.gender,
      size: dog.size,
      status: dog.status,
      description: dog.description,
      rescueStory: dog.rescueStory || '',
      location: dog.location,
      vaccinated: dog.vaccinated,
      sterilized: dog.sterilized,
      medicalNotes: dog.medicalNotes || '',
      photos: dog.photos,
    });
    setPhotoPreviews(dog.photos);
    setPhotoFiles([]);
    setIsDialogOpen(true);
  };

  const handleDelete = (dog: Dog) => {
    setDogToDelete(dog);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenAssignVet = (dog: Dog) => {
    setAssigningDog(dog);
    setSelectedVetId(dog.vetId ?? 'none');
    setIsAssignDialogOpen(true);
  };

  const handleViewAdopter = async (dog: Dog) => {
    if (!dog.adopterId || !token) return;
    setLoadingAdopter(true);
    setIsAdopterDialogOpen(true);
    try {
      const res = await fetch(`${API_URL}/users/${dog.adopterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to load adopter details');
      }
      const data = await res.json();
      setViewingAdopter(data.user);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load adopter details.',
        variant: 'destructive',
      });
      setIsAdopterDialogOpen(false);
    } finally {
      setLoadingAdopter(false);
    }
  };

  const isAdopted = (dog: Dog) => {
    return dog.status === 'adopted' || !!dog.adopterId;
  };

  const handleSaveVetAssignment = async () => {
    if (!assigningDog || !token) return;
    setAssignSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/dogs/${assigningDog.id}/assign-vet`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vetId: selectedVetId === 'none' ? null : selectedVetId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to assign veterinarian');
      }
      toast({
        title: 'Veterinarian updated',
        description:
          selectedVetId === 'none'
            ? 'Vet unassigned from this dog.'
            : 'Dog has been assigned to the selected veterinarian.',
      });
      setIsAssignDialogOpen(false);
      setAssigningDog(null);
      await fetchDogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign veterinarian.',
        variant: 'destructive',
      });
    } finally {
      setAssignSubmitting(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Dog name is required.',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.estimatedAge.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Estimated age is required.',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Description must be at least 10 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const photoBase64s: string[] = [];
      for (const file of photoFiles) {
        const base64 = await convertFileToBase64(file);
        photoBase64s.push(base64);
      }

      const photosToSend = photoFiles.length > 0 ? photoBase64s : (editingDog && editingDog.photos.length > 0 ? undefined : []);

      const url = editingDog ? `${API_URL}/dogs/${editingDog.id}` : `${API_URL}/dogs`;
      const method = editingDog ? 'PUT' : 'POST';

      const payload = {
        name: formData.name.trim(),
        breed: formData.breed.trim() || undefined,
        estimatedAge: formData.estimatedAge.trim(),
        gender: formData.gender,
        size: formData.size,
        status: formData.status,
        description: formData.description.trim(),
        rescueStory: formData.rescueStory.trim() || undefined,
        location: formData.location,
        vaccinated: formData.vaccinated,
        sterilized: formData.sterilized,
        medicalNotes: formData.medicalNotes.trim() || undefined,
        ...(photosToSend !== undefined && { photos: photosToSend }),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save dog');
      }

      toast({
        title: 'Success',
        description: editingDog ? 'Dog updated successfully.' : 'Dog created successfully.',
      });

      setIsDialogOpen(false);
      fetchDogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save dog.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!dogToDelete || !token) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/dogs/${dogToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete dog');
      }

      toast({
        title: 'Success',
        description: 'Dog deleted successfully.',
      });

      setIsDeleteDialogOpen(false);
      setDogToDelete(null);
      fetchDogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete dog.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photoFiles.length > 10) {
      toast({
        title: 'Too many photos',
        description: 'Maximum 10 photos allowed.',
        variant: 'destructive',
      });
      return;
    }

    const newFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload image files only.',
          variant: 'destructive',
        });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload files smaller than 5MB.',
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setPhotoFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index - (photoPreviews.length - prev.length)));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const rescuedDogs = dogs.filter(dog => dog.fromReport);
  const manualDogs = dogs.filter(dog => !dog.fromReport);

  const vetById = useMemo(() => {
    const map: Record<string, VetSummary> = {};
    vets.forEach((v) => {
      map[v.id] = v;
    });
    return map;
  }, [vets]);

  const filteredRescuedDogs = rescuedDogs.filter(dog =>
    dog.name.toLowerCase().includes(searchQueryRescued.toLowerCase()) ||
    dog.breed?.toLowerCase().includes(searchQueryRescued.toLowerCase()) ||
    dog.location.address.toLowerCase().includes(searchQueryRescued.toLowerCase()) ||
    dog.location.district?.toLowerCase().includes(searchQueryRescued.toLowerCase()) ||
    dog.fromReport?.reportedBy.toLowerCase().includes(searchQueryRescued.toLowerCase())
  );

  const filteredManualDogs = manualDogs.filter(dog =>
    dog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dog.breed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dog.location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dog.location.district?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dogs Management</h1>
          <p className="text-muted-foreground">Manage all dogs in the system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDogs} disabled={loading || refreshing} variant="outline" size="sm">
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Dog
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rescued" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rescued">
            Rescued from Reports ({rescuedDogs.length})
          </TabsTrigger>
          <TabsTrigger value="manual">
            Manually Added ({manualDogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Rescued Dogs Tab */}
        <TabsContent value="rescued" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, breed, location, reporter..."
              value={searchQueryRescued}
              onChange={(e) => setSearchQueryRescued(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Rescued Dogs List */}
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Spinner size="lg" className="mx-auto" />
              </CardContent>
            </Card>
          ) : filteredRescuedDogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No rescued dogs found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRescuedDogs.map((dog) => (
                <Card key={dog.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img
                      src={dog.photos[0] || '/placeholder.svg'}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <StatusBadge status={dog.status} />
                      {dog.vetId && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500 text-white">
                          Assigned to Vet
                        </span>
                      )}
                    </div>
                    {dog.fromReport && (
                      <div className="absolute top-2 left-2">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          dog.fromReport.urgency === 'critical' ? 'bg-destructive text-destructive-foreground' :
                          dog.fromReport.urgency === 'high' ? 'bg-status-reported text-white' :
                          'bg-muted text-muted-foreground'
                        )}>
                          From Report
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{dog.name}</h3>
                    {dog.fromReport && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <User className="w-3 h-3" />
                        <span>Reported by: {dog.fromReport.reportedBy}</span>
                      </div>
                    )}
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      {dog.breed && <p>Breed: {dog.breed}</p>}
                      <p>Age: {dog.estimatedAge}</p>
                      <p>Gender: {dog.gender}</p>
                      <p>Size: {dog.size}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{dog.location.address}</span>
                      </div>
                    </div>
                    {dog.vetId && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        Assigned vet:{' '}
                        <span className="font-medium">
                          {vetById[dog.vetId]?.name || 'Unknown'}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      {dog.vaccinated && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Vaccinated</span>
                      )}
                      {dog.sterilized && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Sterilized</span>
                      )}
                    </div>
                    {isAdopted(dog) ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAdopter(dog)}
                          className="flex-1"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          View Adopter
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignVet(dog)}
                          className="flex-1"
                        >
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Assign Vet
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(dog)}
                          className="flex-1"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(dog)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manually Added Dogs Tab */}
        <TabsContent value="manual" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, breed, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Manual Dogs List */}
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Spinner size="lg" className="mx-auto" />
              </CardContent>
            </Card>
          ) : filteredManualDogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No manually added dogs found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredManualDogs.map((dog) => (
                <Card key={dog.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img
                      src={dog.photos[0] || '/placeholder.svg'}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <StatusBadge status={dog.status} />
                      {dog.vetId && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500 text-white">
                          Assigned to Vet
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-primary/20 text-primary">
                        Manual Entry
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{dog.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      {dog.breed && <p>Breed: {dog.breed}</p>}
                      <p>Age: {dog.estimatedAge}</p>
                      <p>Gender: {dog.gender}</p>
                      <p>Size: {dog.size}</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{dog.location.address}</span>
                      </div>
                    </div>
                    {dog.vetId && (
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        Assigned vet:{' '}
                        <span className="font-medium">
                          {vetById[dog.vetId]?.name || 'Unknown'}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      {dog.vaccinated && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Vaccinated</span>
                      )}
                      {dog.sterilized && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Sterilized</span>
                      )}
                    </div>
                    {isAdopted(dog) ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAdopter(dog)}
                          className="flex-1"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          View Adopter
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignVet(dog)}
                          className="flex-1"
                        >
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Assign Vet
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(dog)}
                          className="flex-1"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(dog)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDog ? 'Edit Dog' : 'Add New Dog'}</DialogTitle>
            <DialogDescription>
              {editingDog ? 'Update dog information' : 'Add a new dog to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dog's name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="Breed (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedAge">Estimated Age *</Label>
                <Input
                  id="estimatedAge"
                  value={formData.estimatedAge}
                  onChange={(e) => setFormData({ ...formData, estimatedAge: e.target.value })}
                  placeholder="e.g., 2 years"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value as DogGender })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData({ ...formData, size: value as DogSize })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as DogStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="treated">Treated</SelectItem>
                  <SelectItem value="adoptable">Adoptable</SelectItem>
                  <SelectItem value="adopted">Adopted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the dog's condition, appearance, behavior..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescueStory">Rescue Story</Label>
              <Textarea
                id="rescueStory"
                value={formData.rescueStory}
                onChange={(e) => setFormData({ ...formData, rescueStory: e.target.value })}
                placeholder="How was this dog rescued? (optional)"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <MockMap
                className="h-[200px]"
                selectable
                onLocationSelect={(loc) => setFormData({ ...formData, location: loc })}
              />
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.location.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, address: e.target.value }
                    })}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={formData.location.district || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, district: e.target.value }
                    })}
                    placeholder="District"
                  />
                </div>
              </div>
            </div>

            {/* Medical Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="vaccinated"
                  checked={formData.vaccinated}
                  onChange={(e) => setFormData({ ...formData, vaccinated: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="vaccinated">Vaccinated</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sterilized"
                  checked={formData.sterilized}
                  onChange={(e) => setFormData({ ...formData, sterilized: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="sterilized">Sterilized</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalNotes">Medical Notes</Label>
              <Textarea
                id="medicalNotes"
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                placeholder="Medical history, treatments, medications..."
                rows={3}
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="grid grid-cols-4 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photoPreviews.length < 10 && (
                  <label className="flex items-center justify-center border-2 border-dashed rounded cursor-pointer hover:border-primary transition-colors h-24">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <ButtonSpinner />}
                {submitting ? (editingDog ? 'Updating...' : 'Creating...') : (editingDog ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete {dogToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the dog and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive" disabled={deleting}>
              {deleting && <ButtonSpinner />}
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Vet Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Veterinarian</DialogTitle>
            <DialogDescription>
              {assigningDog?.vetId
                ? `Update veterinarian assignment for ${assigningDog.name}`
                : `Choose a registered veterinarian to manage the treatment for ${assigningDog?.name}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Show existing assignment details */}
            {assigningDog?.vetId && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <h4 className="font-semibold text-sm">Current Assignment</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Assigned Veterinarian:</span>
                    <p className="font-medium">{vetById[assigningDog.vetId]?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Treatment Status:</span>
                    <p className="font-medium capitalize">
                      {assigningDog.treatmentStatus?.replace('_', ' ') || 'Pending'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{vetById[assigningDog.vetId]?.email || 'N/A'}</p>
                  </div>
                  {vetById[assigningDog.vetId]?.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{vetById[assigningDog.vetId].phone}</p>
                    </div>
                  )}
                </div>
                {assigningDog.treatmentStatus && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">Status:</span>
                    <StatusBadge
                      status={
                        assigningDog.treatmentStatus === 'completed'
                          ? 'treated'
                          : assigningDog.treatmentStatus === 'in_progress'
                            ? 'in_progress'
                            : 'reported'
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {loadingVets ? (
              <div className="flex items-center justify-center py-6">
                <Spinner size="lg" />
              </div>
            ) : vets.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-dashed border-muted p-3 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <p>
                  No approved veterinarians found yet. Ask vets to register and get verified by
                  the superadmin.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Veterinarian</Label>
                <Select
                  value={selectedVetId}
                  onValueChange={(value) => setSelectedVetId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select veterinarian" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {vets.map((vet) => (
                      <SelectItem key={vet.id} value={vet.id}>
                        {vet.name} ({vet.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={assignSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveVetAssignment}
              disabled={assignSubmitting || !assigningDog || loadingVets || vets.length === 0}
            >
              {assignSubmitting && <ButtonSpinner />}
              {assignSubmitting ? 'Saving...' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adopter Details Dialog */}
      <Dialog open={isAdopterDialogOpen} onOpenChange={setIsAdopterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adopter Details</DialogTitle>
            <DialogDescription>
              Information about the person who adopted this dog
            </DialogDescription>
          </DialogHeader>
          {loadingAdopter ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="lg" />
            </div>
          ) : viewingAdopter ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                {viewingAdopter.avatar && (
                  <img
                    src={viewingAdopter.avatar}
                    alt={viewingAdopter.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">{viewingAdopter.name}</h3>
                  <p className="text-sm text-muted-foreground">{viewingAdopter.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium capitalize">{viewingAdopter.role}</span>
                </div>
                {viewingAdopter.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{viewingAdopter.phone}</span>
                  </div>
                )}
                {viewingAdopter.organization && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organization:</span>
                    <span className="font-medium">{viewingAdopter.organization}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since:</span>
                  <span className="font-medium">
                    {new Date(viewingAdopter.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No adopter information available</p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAdopterDialogOpen(false);
                setViewingAdopter(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
