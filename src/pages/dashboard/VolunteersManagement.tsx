import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Volunteer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  organization?: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VolunteersManagement() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [deleteVolunteerId, setDeleteVolunteerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    organization: '',
    password: '',
  });
  const { token } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchVolunteers();
    }
  }, [token]);

  const fetchVolunteers = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/volunteers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch volunteers' }));
        throw new Error(error.message || 'Failed to fetch volunteers');
      }

      const data = await response.json();
      setVolunteers(data.volunteers || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load volunteers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingVolunteer(null);
    setFormData({ email: '', name: '', phone: '', organization: '', password: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      email: volunteer.email,
      name: volunteer.name,
      phone: volunteer.phone || '',
      organization: volunteer.organization || '',
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteVolunteerId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: 'Error',
        description: 'Authentication required',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!formData.email || !formData.name) {
      toast({
        title: 'Error',
        description: 'Email and name are required',
        variant: 'destructive',
      });
      return;
    }

    if (!editingVolunteer && !formData.password) {
      toast({
        title: 'Error',
        description: 'Password is required for new volunteers',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const url = editingVolunteer
        ? `${API_URL}/volunteers/${editingVolunteer.id}`
        : `${API_URL}/volunteers`;

      const method = editingVolunteer ? 'PUT' : 'POST';

      const body: any = {
        email: formData.email.trim(),
        name: formData.name.trim(),
      };

      if (formData.phone?.trim()) body.phone = formData.phone.trim();
      if (formData.organization?.trim()) body.organization = formData.organization.trim();
      
      // Only include password if provided (required for new, optional for edit)
      if (!editingVolunteer) {
        body.password = formData.password;
      } else if (formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to save volunteer' }));
        throw new Error(error.message || 'Failed to save volunteer');
      }

      const result = await response.json();
      
      // Optimistic update: update local state immediately
      if (editingVolunteer) {
        setVolunteers(prev => prev.map(v => 
          v.id === editingVolunteer.id ? result.volunteer : v
        ));
      } else {
        setVolunteers(prev => [result.volunteer, ...prev]);
      }

      toast({
        title: 'Success',
        description: editingVolunteer
          ? 'Volunteer updated successfully'
          : 'Volunteer created successfully',
      });

      setIsDialogOpen(false);
      setFormData({ email: '', name: '', phone: '', organization: '', password: '' });
      setEditingVolunteer(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save volunteer',
        variant: 'destructive',
      });
      // Refresh list on error to ensure consistency
      fetchVolunteers();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteVolunteerId || !token) return;

    try {
      setDeleting(true);
      const response = await fetch(`${API_URL}/volunteers/${deleteVolunteerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete volunteer' }));
        throw new Error(error.message || 'Failed to delete volunteer');
      }

      // Optimistic update: remove from local state immediately
      setVolunteers(prev => prev.filter(v => v.id !== deleteVolunteerId));

      toast({
        title: 'Success',
        description: 'Volunteer deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setDeleteVolunteerId(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete volunteer',
        variant: 'destructive',
      });
      // Refresh list on error to ensure consistency
      fetchVolunteers();
    } finally {
      setDeleting(false);
    }
  };

  const filteredVolunteers = volunteers.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Volunteer Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage volunteer accounts
            {volunteers.length > 0 && (
              <span className="ml-2 text-sm">({volunteers.length} total)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchVolunteers}
            disabled={loading || submitting || deleting}
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreate} disabled={loading || submitting || deleting}>
            <Plus className="w-4 h-4 mr-2" />
            Add Volunteer
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search volunteers by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Volunteers List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? 'No volunteers found matching your search' : 'No volunteers yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVolunteers.map((volunteer) => (
            <Card key={volunteer.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{volunteer.name}</h3>
                    <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {volunteer.phone && <span>📞 {volunteer.phone}</span>}
                      {volunteer.organization && <span>🏢 {volunteer.organization}</span>}
                      <span>Joined {new Date(volunteer.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(volunteer)}
                      disabled={loading || submitting || deleting}
                      title="Edit volunteer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(volunteer.id)}
                      disabled={loading || submitting || deleting}
                      title="Delete volunteer"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVolunteer ? 'Edit Volunteer' : 'Create New Volunteer'}
            </DialogTitle>
            <DialogDescription>
              {editingVolunteer
                ? 'Update volunteer information below.'
                : 'Fill in the details to create a new volunteer account.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password {editingVolunteer ? '(leave blank to keep current)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingVolunteer}
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingVolunteer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the volunteer account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
