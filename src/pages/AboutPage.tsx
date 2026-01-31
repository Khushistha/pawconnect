import { Heart, Target, Users, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const team = [
    { name: 'Dr. Maya Shrestha', role: 'Founder & Director', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
    { name: 'Ram Thapa', role: 'Operations Lead', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200' },
    { name: 'Priya Gurung', role: 'Veterinary Director', image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200' },
    { name: 'Suresh Basnet', role: 'Volunteer Coordinator', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' },
  ];

  const values = [
    { icon: Heart, title: 'Compassion', description: 'Every life matters. We treat each dog with love and dignity.' },
    { icon: Target, title: 'Impact', description: 'Focused on sustainable solutions that create lasting change.' },
    { icon: Users, title: 'Community', description: 'Building a network of caring individuals across Nepal.' },
    { icon: Globe, title: 'SDG 15', description: 'Supporting Life on Land through responsible animal welfare.' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 bg-muted/30">
        <div className="container text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
            About Paw Connect
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Paw Connect is Nepal's first comprehensive digital platform for street dog 
            rescue and adoption. We bridge the gap between compassionate citizens, 
            dedicated NGOs, skilled volunteers, and veterinary professionals.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                To create a humane Nepal where every street dog has access to medical care, 
                shelter, and the opportunity to find a loving forever home. We leverage 
                technology to coordinate rescue efforts, streamline adoptions, and build 
                a compassionate community.
              </p>
              <p className="text-muted-foreground mb-6">
                Aligned with the United Nations Sustainable Development Goal 15 (Life on Land), 
                we believe that protecting and caring for street animals is integral to 
                building sustainable communities.
              </p>
              <Button asChild className="btn-hero-primary">
                <Link to="/register">Join Our Mission</Link>
              </Button>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600" 
                alt="Volunteer with dog"
                className="rounded-2xl shadow-elevated"
              />
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-card">
                <div className="text-3xl font-bold text-primary">1,247</div>
                <div className="text-sm text-muted-foreground">Dogs Rescued</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-center mb-4">Our Team</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            A dedicated group of animal lovers, technologists, and community organizers 
            working together to make a difference.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <Card key={member.name} className="overflow-hidden">
                <div className="aspect-square">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Whether you want to adopt, volunteer, or partner with us, 
            there's a place for everyone in the Paw Connect family.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-hero-secondary">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/adopt">Browse Dogs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
