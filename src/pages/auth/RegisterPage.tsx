import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock, Eye, EyeOff, User, Phone, Building2, Upload, X, FileText, Home } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  organization: z.string().optional(),
  verificationDocument: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const roles: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'adopter', 
    label: 'Adopter', 
    description: 'I want to adopt a dog',
    icon: <Heart className="w-5 h-5" />,
  },
  { 
    value: 'volunteer', 
    label: 'Volunteer', 
    description: 'I want to help with rescues',
    icon: <User className="w-5 h-5" />,
  },
  { 
    value: 'veterinarian', 
    label: 'Veterinarian', 
    description: 'I provide medical care',
    icon: <span className="text-lg">🩺</span>,
  },
  { 
    value: 'ngo_admin', 
    label: 'NGO Admin', 
    description: 'I manage a rescue organization',
    icon: <Building2 className="w-5 h-5" />,
  },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('adopter');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register: registerUser, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const requiresVerification = selectedRole === 'veterinarian' || selectedRole === 'ngo_admin';

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image (JPG, PNG) or PDF document',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setDocumentFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDocumentPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setDocumentPreview(null);
      }
    }
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setDocumentPreview(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data: RegisterForm) => {
    if (requiresVerification && !documentFile) {
      toast({
        title: 'Document required',
        description: 'Please upload a verification document for this role',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let documentBase64: string | undefined;
      
      if (documentFile) {
        documentBase64 = await fileToBase64(documentFile);
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: selectedRole,
          phone: data.phone,
          organization: data.organization,
          verificationDocument: documentBase64,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      if (result.requiresVerification) {
        toast({
          title: 'Registration successful',
          description: result.message || 'Your account is pending verification. You will be notified once approved.',
        });
        navigate('/login');
      } else {
        // Auto-login for roles that don't need verification
        const success = await registerUser(data.email, data.password, data.name, selectedRole);
        if (success) {
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-2/5 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200&q=80')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/80" />
        </div>
        <div className="relative h-full flex items-center justify-center p-12 text-primary-foreground">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-bold mb-4">
              Be Part of the Change
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Join thousands of compassionate individuals and organizations 
              working to give Nepal's street dogs a better life.
            </p>
            <div className="space-y-3 text-sm opacity-80">
              <p>✓ Track and coordinate rescue missions</p>
              <p>✓ Connect with a network of volunteers</p>
              <p>✓ Make adoption seamless and transparent</p>
              <p>✓ Access comprehensive medical records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Register</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Logo */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-2xl font-bold">
                Paw<span className="text-primary">Connect</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-muted-foreground">Join our community and start making a difference</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label>I want to join as</Label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    selectedRole === role.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={selectedRole === role.value ? 'text-primary' : 'text-muted-foreground'}>
                      {role.icon}
                    </span>
                    <span className="font-medium">{role.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your name"
                    className="pl-10"
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+977-98..."
                    className="pl-10"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {(selectedRole === 'ngo_admin' || selectedRole === 'veterinarian') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="organization"
                      placeholder="Your organization"
                      className="pl-10"
                      {...register('organization')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verificationDocument">
                    Verification Document *
                    <span className="text-xs text-muted-foreground ml-2">
                      (License, Certificate, or Registration Document)
                    </span>
                  </Label>
                  {!documentFile ? (
                    <label
                      htmlFor="document-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, PDF (MAX. 5MB)
                      </p>
                      <input
                        id="document-upload"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocumentChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative border-2 border-border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        {documentPreview ? (
                          <img
                            src={documentPreview}
                            alt="Document preview"
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{documentFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeDocument}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your account will be reviewed by an administrator before you can login.
                  </p>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full btn-hero-primary" disabled={isLoading || isSubmitting}>
              {isLoading || isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
