import { Link } from 'react-router-dom';
import { 
  Heart, 
  PawPrint, 
  Users, 
  Building2, 
  MapPin, 
  Shield, 
  ArrowRight,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import heroImage from '@/assets/hero-dog.jpg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DogCard } from '@/components/dogs/DogCard';
import { mockDogs, mockStats } from '@/data/mockData';

export default function LandingPage() {
  const adoptableDogs = mockDogs.filter(d => d.status === 'adoptable').slice(0, 3);

  const stats = [
    { value: mockStats.totalRescues.toLocaleString(), label: 'Dogs Rescued', icon: PawPrint },
    { value: mockStats.totalAdoptions.toLocaleString(), label: 'Happy Adoptions', icon: Heart },
    { value: mockStats.activeNGOs.toString(), label: 'Partner NGOs', icon: Building2 },
    { value: mockStats.activeVolunteers.toString(), label: 'Active Volunteers', icon: Users },
  ];

  const features = [
    {
      icon: MapPin,
      title: 'Report Strays',
      description: 'Spotted a dog in need? Report with GPS location and photos for quick rescue.',
    },
    {
      icon: Shield,
      title: 'Medical Care',
      description: 'Every rescued dog receives vaccination, sterilization, and complete medical care.',
    },
    {
      icon: Heart,
      title: 'Find Your Match',
      description: 'Browse adoptable dogs and find your perfect companion through our platform.',
    },
    {
      icon: Users,
      title: 'Join Our Network',
      description: 'Volunteers, NGOs, and veterinarians working together across Nepal.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
        </div>

        <div className="container relative z-10 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Supporting SDG 15 – Life on Land</span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Every Street Dog
            <br />
            <span className="gradient-text">Deserves a Home</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Connecting rescued dogs with loving families across Nepal. 
            Report strays, volunteer, or adopt – together we make a difference.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button asChild size="lg" className="btn-hero-primary text-lg px-8 py-6 rounded-xl">
              <Link to="/adopt">
                <PawPrint className="w-5 h-5 mr-2" />
                Adopt a Dog
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl bg-card/50 backdrop-blur-sm">
              <Link to="/report">
                <MapPin className="w-5 h-5 mr-2" />
                Report a Stray
              </Link>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 opacity-80" />
                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm md:text-base opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              How Paw Connect Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete ecosystem connecting citizens, NGOs, volunteers, and veterinarians 
              to rescue and rehome street dogs across Nepal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="card-interactive animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Adoptable Dogs Section */}
      <section className="py-20">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Dogs Looking for Homes
              </h2>
              <p className="text-muted-foreground">
                Meet our wonderful dogs ready for adoption
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2 self-start md:self-auto">
              <Link to="/adopt">
                View All Dogs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adoptableDogs.map((dog, index) => (
              <div 
                key={dog.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <DogCard dog={dog} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Whether you want to adopt, volunteer, or register your organization, 
            there's a place for you in the Paw Connect community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="btn-hero-secondary text-lg px-8 py-6 rounded-xl">
              <Link to="/register">
                Get Started
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/about">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
