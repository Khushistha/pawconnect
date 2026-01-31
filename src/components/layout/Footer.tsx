import { Link } from 'react-router-dom';
import { Heart, Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sidebar-primary to-primary flex items-center justify-center">
                <Heart className="w-5 h-5 text-sidebar-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-xl font-bold">
                Paw<span className="text-sidebar-primary">Connect</span>
              </span>
            </Link>
            <p className="text-sm text-sidebar-foreground/70">
              Connecting rescued dogs with loving families across Nepal. 
              Supporting SDG 15 – Life on Land.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-primary transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-primary transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-primary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              <li><Link to="/adopt" className="hover:text-sidebar-primary transition-colors">Adopt a Dog</Link></li>
              <li><Link to="/report" className="hover:text-sidebar-primary transition-colors">Report a Stray</Link></li>
              <li><Link to="/about" className="hover:text-sidebar-primary transition-colors">About Us</Link></li>
              <li><Link to="/volunteer" className="hover:text-sidebar-primary transition-colors">Volunteer</Link></li>
              <li><Link to="/donate" className="hover:text-sidebar-primary transition-colors">Donate</Link></li>
            </ul>
          </div>

          {/* For Organizations */}
          <div>
            <h4 className="font-semibold mb-4">For Organizations</h4>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              <li><Link to="/register" className="hover:text-sidebar-primary transition-colors">Register as NGO</Link></li>
              <li><Link to="/register" className="hover:text-sidebar-primary transition-colors">Partner with Us</Link></li>
              <li><Link to="/resources" className="hover:text-sidebar-primary transition-colors">Resources</Link></li>
              <li><Link to="/faq" className="hover:text-sidebar-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sidebar-primary" />
                Kathmandu, Nepal
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sidebar-primary" />
                +977-1-4123456
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sidebar-primary" />
                hello@pawconnect.org.np
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-sidebar-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-sidebar-foreground/50">
          <p>© 2024 Paw Connect Nepal. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-sidebar-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-sidebar-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
