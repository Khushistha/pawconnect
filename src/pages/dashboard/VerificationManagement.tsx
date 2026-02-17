import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner, ButtonSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PendingUser {
  id: string;
  email: string;
  name: string;
  role: 'veterinarian' | 'ngo_admin';
  phone?: string;
  organization?: string;
  verificationDocumentUrl?: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function VerificationManagement() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [viewingUser, setViewingUser] = useState<PendingUser | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchPendingUsers();
    }
  }, [token]);

  const fetchPendingUsers = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/verifications/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending verifications');
      }

      const data = await response.json();
      setPendingUsers(data.users || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load pending verifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!token) return;

    setApprovingUserId(userId);
    try {
      const response = await fetch(`${API_URL}/verifications/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve user');
      }

      toast({
        title: 'Success',
        description: 'User approved successfully',
      });

      fetchPendingUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve user',
        variant: 'destructive',
      });
    } finally {
      setApprovingUserId(null);
    }
  };

  const handleReject = (userId: string) => {
    setRejectingUserId(userId);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectingUserId || !token) return;

    setIsRejecting(true);
    const currentRejectingId = rejectingUserId;
    try {
      const response = await fetch(`${API_URL}/verifications/${rejectingUserId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject user');
      }

      toast({
        title: 'Success',
        description: 'User rejected successfully',
      });

      setIsRejectDialogOpen(false);
      setRejectingUserId(null);
      setRejectionReason('');
      fetchPendingUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject user',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const viewDocument = (user: PendingUser) => {
    setViewingUser(user);
    setIsViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verification Management</h1>
          <p className="text-muted-foreground">
            Review and approve pending veterinarian and NGO admin registrations
            {pendingUsers.length > 0 && (
              <span className="ml-2 text-sm">({pendingUsers.length} pending)</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchPendingUsers}
          disabled={loading}
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Pending Users List */}
      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-status-treated" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending verifications at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.role === 'veterinarian' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      }`}>
                        {user.role === 'veterinarian' ? 'Veterinarian' : 'NGO Admin'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {user.phone && <span>📞 {user.phone}</span>}
                      {user.organization && <span>🏢 {user.organization}</span>}
                      <span>Registered {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    {user.verificationDocumentUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => viewDocument(user)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Document
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(user.id)}
                      className="text-destructive"
                      disabled={approvingUserId === user.id || rejectingUserId === user.id}
                    >
                      {rejectingUserId === user.id && <ButtonSpinner />}
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                      className="bg-status-treated hover:bg-status-treated/90"
                      disabled={approvingUserId === user.id || rejectingUserId === user.id}
                    >
                      {approvingUserId === user.id && <ButtonSpinner />}
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Verification Document</DialogTitle>
            <DialogDescription>
              {viewingUser?.name} - {viewingUser?.role === 'veterinarian' ? 'Veterinarian' : 'NGO Admin'}
            </DialogDescription>
          </DialogHeader>
          {viewingUser?.verificationDocumentUrl && (
            <div className="mt-4">
              {viewingUser.verificationDocumentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img
                  src={viewingUser.verificationDocumentUrl}
                  alt="Verification document"
                  className="w-full rounded-lg border"
                />
              ) : (
                <iframe
                  src={viewingUser.verificationDocumentUrl}
                  className="w-full h-[600px] rounded-lg border"
                  title="Verification document"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejection (optional). This will be shown to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="rejectionReason">Rejection Reason (Optional)</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Document is unclear, missing information, etc."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsRejectDialogOpen(false);
              setRejectionReason('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isRejecting}
            >
              {isRejecting && <ButtonSpinner />}
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
