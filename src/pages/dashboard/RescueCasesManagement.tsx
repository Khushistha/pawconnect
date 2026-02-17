import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Upload, MapPin, RefreshCw, AlertCircle, Phone, PawPrint } from 'lucide-react';
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
import type { Dog, Location, DogStatus, DogGender, DogSize, RescueReport, RescueStatus } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RescueCasesManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [reports, setReports] = useState<RescueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryReports, setSearchQueryReports] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [editingReport, setEditingReport] = useState<RescueReport | null>(null);
  const [dogToDelete, setDogToDelete] = useState<Dog | null>(null);
  const [reportToDelete, setReportToDelete] = useState<RescueReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [creatingDog, setCreatingDog] = useState<string | null>(null);

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
        description: error.message || 'Failed to load rescue cases.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, toast]);

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoadingReports(true);
    try {
      const response = await fetch(`${API_URL}/reports/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data.items || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reports.',
        variant: 'destructive',
      });
    } finally {
      setLoadingReports(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchDogs();
    fetchReports();
  }, [fetchDogs, fetchReports]);

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
      photos: dog.photos || [],
    });
    setPhotoFiles([]);
    setPhotoPreviews(dog.photos || []);
    setIsDialogOpen(true);
  };

  const handleDelete = (dog: Dog) => {
    setDogToDelete(dog);
    setIsDeleteDialogOpen(true);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length + photoFiles.length > 10) {
      toast({
        title: 'Too many photos',
        description: 'Maximum 10 photos allowed.',
        variant: 'destructive',
      });
      return;
    }

    const newFiles = [...photoFiles, ...files];
    setPhotoFiles(newFiles);

    // Create previews
    const previewPromises = newFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const previews = await Promise.all(previewPromises);
    setPhotoPreviews([...formData.photos, ...previews]);
  };

  const removePhoto = (index: number) => {
    const newFiles = photoFiles.filter((_, i) => i !== index - formData.photos.length);
    setPhotoFiles(newFiles);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPreviews);
  };

  const handleLocationSelect = (location: Location) => {
    setFormData({ ...formData, location });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validation
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
      // Convert new photo files to base64
      const photoBase64s: string[] = [];
      for (const file of photoFiles) {
        const base64 = await convertFileToBase64(file);
        photoBase64s.push(base64);
      }

      // When editing: if photos are provided, backend replaces all photos
      // So we only send new photos (base64). If no new photos, don't send photos array (backend keeps existing)
      const photosToSend = photoFiles.length > 0 ? photoBase64s : undefined;

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
        throw new Error(errorData.message || 'Failed to save rescue case');
      }

      toast({
        title: 'Success',
        description: editingDog ? 'Rescue case updated successfully.' : 'Rescue case created successfully.',
      });

      setIsDialogOpen(false);
      fetchDogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save rescue case.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      if (dogToDelete) {
        const response = await fetch(`${API_URL}/dogs/${dogToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete rescue case');
        }

        toast({
          title: 'Success',
          description: 'Rescue case deleted successfully.',
        });
        fetchDogs();
      } else if (reportToDelete) {
        // Note: Backend doesn't have DELETE endpoint for reports yet, but we can add it
        // For now, we'll just update status to cancelled
        const response = await fetch(`${API_URL}/reports/${reportToDelete.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'cancelled' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to cancel report');
        }

        toast({
          title: 'Success',
          description: 'Report cancelled successfully.',
        });
        fetchReports();
      }

      setIsDeleteDialogOpen(false);
      setDogToDelete(null);
      setReportToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredDogs = dogs.filter(dog =>
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
          <h1 className="text-2xl font-bold">Rescue Cases Management</h1>
          <p className="text-muted-foreground">Manage manual cases and volunteer reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchDogs(); fetchReports(); }} disabled={loading || refreshing || loadingReports} variant="outline" size="sm">
            <RefreshCw className={cn('w-4 h-4 mr-2', (refreshing || loadingReports) && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rescue Case
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Cases ({dogs.length})</TabsTrigger>
          <TabsTrigger value="reports">Volunteer Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {/* Manual Cases Tab */}
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

          {/* Dogs List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Spinner size="lg" className="mx-auto" />
          </CardContent>
        </Card>
      ) : filteredDogs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No rescue cases found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDogs.map((dog) => (
            <Card key={dog.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={dog.photos[0] || '/placeholder.svg'}
                  alt={dog.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <StatusBadge status={dog.status} />
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
                <div className="flex items-center gap-2 mb-3">
                  {dog.vaccinated && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Vaccinated</span>
                  )}
                  {dog.sterilized && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">Sterilized</span>
                  )}
                </div>
                <div className="flex gap-2">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        {/* Volunteer Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by description, location, reporter..."
              value={searchQueryReports}
              onChange={(e) => setSearchQueryReports(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Reports List */}
          {loadingReports ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Spinner size="lg" className="mx-auto" />
              </CardContent>
            </Card>
          ) : reports.filter(r =>
            r.description.toLowerCase().includes(searchQueryReports.toLowerCase()) ||
            r.location.address.toLowerCase().includes(searchQueryReports.toLowerCase()) ||
            r.location.district?.toLowerCase().includes(searchQueryReports.toLowerCase()) ||
            r.reportedBy.toLowerCase().includes(searchQueryReports.toLowerCase())
          ).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No reports found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.filter(r =>
                r.description.toLowerCase().includes(searchQueryReports.toLowerCase()) ||
                r.location.address.toLowerCase().includes(searchQueryReports.toLowerCase()) ||
                r.location.district?.toLowerCase().includes(searchQueryReports.toLowerCase()) ||
                r.reportedBy.toLowerCase().includes(searchQueryReports.toLowerCase())
              ).map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {report.photos[0] && (
                        <img
                          src={report.photos[0]}
                          alt="Report"
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={report.status} />
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            report.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                            report.urgency === 'high' ? 'bg-status-reported/10 text-status-reported' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {report.urgency.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{report.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {report.location.address}
                          </span>
                          {report.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {report.contactPhone}
                            </span>
                          )}
                          <span>Reported by: {report.reportedBy}</span>
                          <span>{new Date(report.reportedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!report.dogId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!token) return;
                                setCreatingDog(report.id);
                                try {
                                  const response = await fetch(`${API_URL}/reports/${report.id}/create-dog`, {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                    },
                                  });

                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || 'Failed to create dog from report');
                                  }

                                  const data = await response.json();
                                  
                                  // Update report to include dogId
                                  setReports(prev => prev.map(r => 
                                    r.id === report.id ? { ...r, dogId: data.item.id } : r
                                  ));

                                  // Refresh dogs list
                                  fetchDogs();

                                  toast({
                                    title: 'Success',
                                    description: 'Dog created from report successfully. You can now find it in the Dogs section.',
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: 'Error',
                                    description: error.message || 'Failed to create dog from report',
                                    variant: 'destructive',
                                  });
                                } finally {
                                  setCreatingDog(null);
                                }
                              }}
                              disabled={creatingDog === report.id}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              {creatingDog === report.id ? (
                                <>
                                  <ButtonSpinner />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <PawPrint className="w-4 h-4 mr-1" />
                                  Create Dog
                                </>
                              )}
                            </Button>
                          )}
                          {report.dogId && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                              Dog Created
                            </span>
                          )}
                          <Select
                            value={report.status}
                            onValueChange={(value) => {
                              const updateStatus = async () => {
                                if (!token) return;
                                setUpdatingStatus(report.id);
                                try {
                                  const response = await fetch(`${API_URL}/reports/${report.id}/status`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ status: value }),
                                  });

                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.message || 'Failed to update status');
                                  }

                                  setReports(prev => prev.map(r => 
                                    r.id === report.id ? { ...r, status: value as RescueStatus } : r
                                  ));

                                  toast({
                                    title: 'Success',
                                    description: 'Report status updated successfully',
                                  });
                                } catch (error: any) {
                                  toast({
                                    title: 'Error',
                                    description: error.message || 'Failed to update status',
                                    variant: 'destructive',
                                  });
                                } finally {
                                  setUpdatingStatus(null);
                                }
                              };
                              updateStatus();
                            }}
                            disabled={updatingStatus === report.id || creatingDog === report.id}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              {updatingStatus === report.id ? (
                                <ButtonSpinner />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReportToDelete(report);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive"
                            disabled={creatingDog === report.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDog ? 'Edit Rescue Case' : 'Create New Rescue Case'}</DialogTitle>
            <DialogDescription>
              {editingDog ? 'Update the rescue case details below.' : 'Fill in the details to create a new rescue case.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Dog Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
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
                  placeholder="e.g., 2 years, 6 months"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: DogGender) => setFormData({ ...formData, gender: value })}
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
                <Label htmlFor="size">Size *</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value: DogSize) => setFormData({ ...formData, size: value })}
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
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: DogStatus) => setFormData({ ...formData, status: value })}
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
                rows={4}
                placeholder="Describe the dog's condition, appearance, and any important details..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescueStory">Rescue Story</Label>
              <Textarea
                id="rescueStory"
                value={formData.rescueStory}
                onChange={(e) => setFormData({ ...formData, rescueStory: e.target.value })}
                rows={3}
                placeholder="How was this dog rescued? Share the story..."
              />
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <div className="h-64 rounded-lg overflow-hidden">
                <MockMap
                  center={formData.location}
                  onLocationSelect={handleLocationSelect}
                  selectable
                />
              </div>
              <Input
                value={formData.location.address}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, address: e.target.value }
                })}
                placeholder="Address"
                required
              />
              <Input
                value={formData.location.district || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, district: e.target.value }
                })}
                placeholder="District (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="vaccinated"
                  checked={formData.vaccinated}
                  onChange={(e) => setFormData({ ...formData, vaccinated: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="vaccinated">Vaccinated</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sterilized"
                  checked={formData.sterilized}
                  onChange={(e) => setFormData({ ...formData, sterilized: e.target.checked })}
                  className="rounded"
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
                rows={3}
                placeholder="Any medical information, treatments, or notes..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photos">Photos (Max 10)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" asChild>
                  <label htmlFor="photos" className="cursor-pointer">
                    <Upload className="w-4 h-4" />
                  </label>
                </Button>
              </div>
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
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
                </div>
              )}
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
            <AlertDialogTitle>
              {dogToDelete 
                ? `Are you sure you want to delete ${dogToDelete.name}?`
                : `Are you sure you want to cancel this report?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dogToDelete
                ? 'This action cannot be undone. This will permanently delete the rescue case and all associated data.'
                : 'This will mark the report as cancelled. This action can be reversed by updating the status.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive" disabled={deleting}>
              {deleting && <ButtonSpinner />}
              {deleting ? (dogToDelete ? 'Deleting...' : 'Cancelling...') : (dogToDelete ? 'Delete' : 'Cancel Report')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
