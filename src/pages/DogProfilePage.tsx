import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Heart, 
  Share2, 
  CheckCircle2,
  Clock,
  Syringe,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { mockDogs, mockMedicalRecords } from '@/data/mockData';

export default function DogProfilePage() {
  const { id } = useParams();
  const dog = mockDogs.find(d => d.id === id);
  const medicalRecords = mockMedicalRecords.filter(r => r.dogId === id);

  if (!dog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dog not found</h1>
          <Button asChild>
            <Link to="/adopt">Back to Adoption Gallery</Link>
          </Button>
        </div>
      </div>
    );
  }

  const details = [
    { label: 'Age', value: dog.estimatedAge },
    { label: 'Gender', value: dog.gender, className: 'capitalize' },
    { label: 'Size', value: dog.size, className: 'capitalize' },
    { label: 'Breed', value: dog.breed || 'Mixed Breed' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-6xl">
        {/* Back Button */}
        <Link 
          to="/adopt" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gallery
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Photos */}
          <div className="lg:col-span-3 space-y-4">
            {/* Main Photo */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src={dog.photos[0] || '/placeholder.svg'}
                alt={dog.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <StatusBadge status={dog.status} />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Heart className="w-5 h-5" />
                </Button>
                <Button size="icon" variant="secondary" className="rounded-full">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {dog.photos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {dog.photos.map((photo, index) => (
                  <button
                    key={index}
                    className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden ring-2 ring-transparent hover:ring-primary transition-all"
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Rescue Story */}
            {dog.rescueStory && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rescue Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{dog.rescueStory}</p>
                </CardContent>
              </Card>
            )}

            {/* Medical History */}
            {medicalRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medical History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.type === 'vaccination' ? 'bg-status-progress/10 text-status-progress' :
                        record.type === 'sterilization' ? 'bg-primary/10 text-primary' :
                        'bg-secondary/10 text-secondary'
                      }`}>
                        {record.type === 'vaccination' && <Syringe className="w-5 h-5" />}
                        {record.type === 'sterilization' && <Scissors className="w-5 h-5" />}
                        {(record.type === 'treatment' || record.type === 'checkup') && <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium capitalize">{record.type}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{record.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">By {record.vetName}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name & Basics */}
            <div>
              <h1 className="font-display text-3xl font-bold mb-2">{dog.name}</h1>
              <p className="text-muted-foreground mb-4">{dog.breed || 'Mixed Breed'}</p>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span>{dog.location.address}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Rescued on {new Date(dog.reportedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick Details */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {details.map((detail) => (
                    <div key={detail.label}>
                      <p className="text-xs text-muted-foreground mb-1">{detail.label}</p>
                      <p className={`font-medium ${detail.className || ''}`}>{detail.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Health Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Health Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Vaccinated</span>
                  </div>
                  {dog.vaccinated ? (
                    <CheckCircle2 className="w-5 h-5 text-status-treated" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Sterilized</span>
                  </div>
                  {dog.sterilized ? (
                    <CheckCircle2 className="w-5 h-5 text-status-treated" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                {dog.medicalNotes && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{dog.medicalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">About {dog.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{dog.description}</p>
              </CardContent>
            </Card>

            {/* CTA */}
            {dog.status === 'adoptable' && (
              <div className="space-y-3">
                <Button asChild className="w-full btn-hero-primary py-6 text-lg">
                  <Link to={`/adopt/${dog.id}`}>
                    <Heart className="w-5 h-5 mr-2" />
                    Apply to Adopt {dog.name}
                  </Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Applications typically take 3-5 days to review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
