// User & Auth Types
export type UserRole = 'superadmin' | 'public' | 'ngo_admin' | 'volunteer' | 'veterinarian' | 'adopter';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  organization?: string;
  createdAt: string;
}

// Dog Types
export type DogStatus = 'reported' | 'in_progress' | 'treated' | 'adoptable' | 'adopted';
export type DogSize = 'small' | 'medium' | 'large';
export type DogGender = 'male' | 'female' | 'unknown';

export interface Dog {
  id: string;
  name: string;
  breed?: string;
  estimatedAge: string;
  gender: DogGender;
  size: DogSize;
  status: DogStatus;
  description: string;
  rescueStory?: string;
  photos: string[];
  location: Location;
  vaccinated: boolean;
  sterilized: boolean;
  medicalNotes?: string;
  reportedAt: string;
  rescuedAt?: string;
  adoptedAt?: string;
  adopterId?: string;
}

// Location Types
export interface Location {
  lat: number;
  lng: number;
  address: string;
  district?: string;
}

// Rescue Report Types
export type RescueStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface RescueReport {
  id: string;
  description: string;
  photos: string[];
  location: Location;
  status: RescueStatus;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  dogId?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

// Adoption Application Types
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface AdoptionApplication {
  id: string;
  dogId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  status: ApplicationStatus;
  homeType: string;
  hasYard: boolean;
  otherPets: string;
  experience: string;
  reason: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

// Medical Record Types
export interface MedicalRecord {
  id: string;
  dogId: string;
  vetId: string;
  vetName: string;
  date: string;
  type: 'vaccination' | 'sterilization' | 'treatment' | 'checkup';
  description: string;
  medications?: string[];
  nextFollowUp?: string;
}

// Statistics Types
export interface PlatformStats {
  totalRescues: number;
  pendingRescues: number;
  totalAdoptions: number;
  adoptableDogs: number;
  activeNGOs: number;
  activeVolunteers: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}
