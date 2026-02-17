import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MockMap } from '@/components/maps/MockMap';
import { ButtonSpinner, LoadingOverlay } from '@/components/ui/spinner';
import type { Location } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const reportSchema = z.object({
  description: z.string().min(20, 'Please provide more details (at least 20 characters)'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  contactName: z.string().min(2, 'Please enter your name'),
  contactPhone: z.string().min(10, 'Please enter a valid phone number'),
});

type ReportForm = z.infer<typeof reportSchema>;

export default function ReportDogPage() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      urgency: 'medium',
      contactName: user?.name || '',
      contactPhone: user?.phone || '',
    },
  });

  // Update form when user data is available
  useEffect(() => {
    if (user) {
      setValue('contactName', user.name || '');
      setValue('contactPhone', user.phone || '');
    }
  }, [user, setValue]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, 4 - photoFiles.length);
      setPhotoFiles(prev => [...prev, ...newFiles]);

      // Create previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data: ReportForm) => {
    if (!selectedLocation) {
      toast({
        title: 'Location required',
        description: 'Please select the location on the map',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedLocation.address || selectedLocation.address.trim().length < 2) {
      toast({
        title: 'Address required',
        description: 'Please enter a valid address for the location',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert photos to base64
      const photoBase64s: string[] = [];
      for (const file of photoFiles) {
        const base64 = await convertFileToBase64(file);
        photoBase64s.push(base64);
      }

      // Prepare report data
      const reportData = {
        description: data.description,
        urgency: data.urgency,
        reportedBy: data.contactName,
        contactPhone: data.contactPhone,
        location: {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address: selectedLocation.address,
          district: selectedLocation.district,
        },
        photos: photoBase64s.length > 0 ? photoBase64s : undefined,
      };

      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(result?.message || result?.error || 'Failed to submit report');
      }

      setIsSubmitting(false);
      setSubmitted(true);
      
      toast({
        title: 'Report submitted!',
        description: 'Our rescue team has been notified and will respond shortly.',
      });
    } catch (error: any) {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-status-treated/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-status-treated" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-3">Thank You for Reporting!</h1>
          <p className="text-muted-foreground mb-6">
            Your report has been submitted successfully. Our volunteer team will be 
            dispatched to the location shortly. You may receive a call for additional details.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/')}>Return Home</Button>
            <Button variant="outline" onClick={() => {
              setSubmitted(false);
              setSelectedLocation(null);
              setPhotoFiles([]);
              setPhotoPreviews([]);
            }}>
              Submit Another Report
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const urgencyOptions = [
    { value: 'low', label: 'Low', description: 'Dog appears healthy' },
    { value: 'medium', label: 'Medium', description: 'Needs attention soon' },
    { value: 'high', label: 'High', description: 'Injured or sick' },
    { value: 'critical', label: 'Critical', description: 'Life-threatening' },
  ];

  return (
    <div className="min-h-screen py-8 lg:py-12">
      <div className="container max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Report a Dog in Need
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Spotted a stray dog that needs help? Report it here and our volunteer 
            network will coordinate a rescue mission.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Click on the map to mark where you spotted the dog
              </p>
              <MockMap
                className="h-[300px]"
                selectable
                onLocationSelect={setSelectedLocation}
              />
              {selectedLocation && (
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Selected Location</p>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="location-address" className="text-xs">Address *</Label>
                        <Input
                          id="location-address"
                          value={selectedLocation.address}
                          onChange={(e) => setSelectedLocation({
                            ...selectedLocation,
                            address: e.target.value
                          })}
                          placeholder="Enter the address or location description"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location-district" className="text-xs">District (Optional)</Label>
                        <Input
                          id="location-district"
                          value={selectedLocation.district || ''}
                          onChange={(e) => setSelectedLocation({
                            ...selectedLocation,
                            district: e.target.value || undefined
                          })}
                          placeholder="e.g., Kaski, Kathmandu"
                          className="mt-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Photos (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoPreviews.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={photo} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoFiles.length < 4 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Upload up to 4 photos to help our team identify and locate the dog
              </p>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">What did you observe?</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the dog's appearance, behavior, and condition..."
                  rows={4}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Urgency Level</Label>
                <RadioGroup defaultValue="medium" className="grid grid-cols-2 gap-3">
                  {urgencyOptions.map((option) => (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="peer sr-only"
                        {...register('urgency')}
                      />
                      <Label
                        htmlFor={option.value}
                        className="flex flex-col p-4 rounded-lg border-2 cursor-pointer hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all"
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Your Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Your Name</Label>
                  <Input
                    id="contactName"
                    placeholder="Enter your name"
                    {...register('contactName')}
                  />
                  {errors.contactName && (
                    <p className="text-sm text-destructive">{errors.contactName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+977-98..."
                    {...register('contactPhone')}
                  />
                  {errors.contactPhone && (
                    <p className="text-sm text-destructive">{errors.contactPhone.message}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We may contact you for additional details about the location or dog
              </p>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-secondary/10 rounded-lg border border-secondary/30">
            <AlertTriangle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-secondary-foreground">Safety First</p>
              <p className="text-muted-foreground">
                Please do not approach aggressive or scared dogs. Keep a safe distance and 
                wait for our trained volunteers.
              </p>
            </div>
          </div>

          {/* Submit */}
          <LoadingOverlay isLoading={isSubmitting}>
            <Button 
              type="submit" 
              className="w-full btn-hero-primary py-6 text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting && <ButtonSpinner />}
              {isSubmitting ? 'Submitting Report...' : 'Submit Rescue Report'}
            </Button>
          </LoadingOverlay>
        </form>
      </div>
    </div>
  );
}
