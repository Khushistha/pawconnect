import { useState } from 'react';
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
import type { Location } from '@/types';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  description: z.string().min(20, 'Please provide more details (at least 20 characters)'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  contactName: z.string().min(2, 'Please enter your name'),
  contactPhone: z.string().min(10, 'Please enter a valid phone number'),
});

type ReportForm = z.infer<typeof reportSchema>;

export default function ReportDogPage() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      urgency: 'medium',
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, you'd upload to a server. Here we create object URLs for demo
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 4));
    }
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

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
    
    toast({
      title: 'Report submitted!',
      description: 'Our rescue team has been notified and will respond shortly.',
    });
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
              setPhotos([]);
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
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Selected Location</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
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
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
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
          <Button 
            type="submit" 
            className="w-full btn-hero-primary py-6 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting Report...' : 'Submit Rescue Report'}
          </Button>
        </form>
      </div>
    </div>
  );
}
