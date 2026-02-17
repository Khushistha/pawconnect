import { useState, useEffect, useCallback } from 'react';
import { Building2, Search, Mail, Phone, MapPin, Calendar, Users, PawPrint, CheckCircle2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Spinner, ButtonSpinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface NGO {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  organization?: string;
  avatar?: string;
  verificationStatus: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  stats: {
    totalDogs: number;
    totalReports: number;
    completedRescues: number;
  };
}

interface RescueOperation {
  dogs: Array<{
    id: string;
    name: string;
    status: string;
    reportedAt: string;
    rescuedAt?: string;
    adoptedAt?: string;
    location: {
      address: string;
      district?: string;
    };
  }>;
  reports: Array<{
    id: string;
    description: string;
    status: string;
    urgency: string;
    reportedBy: string;
    reportedAt: string;
    location: {
      address: string;
      district?: string;
    };
    dogId?: string;
  }>;
}

export default function NGOManagement() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNGO, setSelectedNGO] = useState<NGO | null>(null);
  const [rescueOperations, setRescueOperations] = useState<RescueOperation | null>(null);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchNGOs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/ngos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch NGOs');
      const data = await response.json();
      setNgos(data.ngos || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load NGOs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (token) {
      fetchNGOs();
    }
  }, [token, fetchNGOs]);

  const fetchRescueOperations = async (ngoId: string) => {
    if (!token) return;
    setLoadingOperations(true);
    try {
      const response = await fetch(`${API_URL}/ngos/${ngoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch rescue operations');
      const data = await response.json();
      setRescueOperations(data.rescueOperations);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load rescue operations.',
        variant: 'destructive',
      });
    } finally {
      setLoadingOperations(false);
    }
  };

  const handleViewDetails = (ngo: NGO) => {
    setSelectedNGO(ngo);
    setIsDialogOpen(true);
    fetchRescueOperations(ngo.id);
  };

  const filteredNGOs = ngos.filter(ngo =>
    ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ngo.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ngo.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ngo.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NGO Management</h1>
          <p className="text-muted-foreground">View all registered and verified NGOs</p>
        </div>
        <Button onClick={fetchNGOs} disabled={loading || refreshing} variant="outline" size="sm">
          <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, organization, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* NGOs List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Spinner size="lg" className="mx-auto" />
          </CardContent>
        </Card>
      ) : filteredNGOs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No verified NGOs found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNGOs.map((ngo) => (
            <Card key={ngo.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {ngo.avatar ? (
                    <img
                      src={ngo.avatar}
                      alt={ngo.name}
                      className="w-12 h-12 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{ngo.name}</CardTitle>
                    {ngo.organization && (
                      <p className="text-sm text-muted-foreground truncate">{ngo.organization}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{ngo.email}</span>
                  </div>
                  {ngo.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{ngo.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Verified: {ngo.verifiedAt ? new Date(ngo.verifiedAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{ngo.stats.totalDogs}</div>
                    <div className="text-xs text-muted-foreground">Dogs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-status-reported">{ngo.stats.totalReports}</div>
                    <div className="text-xs text-muted-foreground">Reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-status-adopted">{ngo.stats.completedRescues}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleViewDetails(ngo)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedNGO?.name} - Rescue Operations</DialogTitle>
            <DialogDescription>
              View detailed rescue operations and statistics for this NGO
            </DialogDescription>
          </DialogHeader>

          {selectedNGO && (
            <div className="space-y-6">
              {/* NGO Info */}
              <Card>
                <CardHeader>
                  <CardTitle>NGO Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-sm">{selectedNGO.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Organization</p>
                      <p className="text-sm">{selectedNGO.organization || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedNGO.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedNGO.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Verified At</p>
                      <p className="text-sm">
                        {selectedNGO.verifiedAt ? new Date(selectedNGO.verifiedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registered</p>
                      <p className="text-sm">{new Date(selectedNGO.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rescue Operations */}
              {loadingOperations ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : rescueOperations ? (
                <div className="space-y-4">
                  {/* Dogs Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PawPrint className="w-5 h-5" />
                        Dogs Managed ({rescueOperations.dogs.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {rescueOperations.dogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No dogs found</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {rescueOperations.dogs.map((dog) => (
                            <div key={dog.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{dog.name}</span>
                                <StatusBadge status={dog.status as any} />
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Location: {dog.location.address}</p>
                                <p>Reported: {new Date(dog.reportedAt).toLocaleDateString()}</p>
                                {dog.rescuedAt && (
                                  <p>Rescued: {new Date(dog.rescuedAt).toLocaleDateString()}</p>
                                )}
                                {dog.adoptedAt && (
                                  <p>Adopted: {new Date(dog.adoptedAt).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Reports Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Rescue Reports ({rescueOperations.reports.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {rescueOperations.reports.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No reports found</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {rescueOperations.reports.map((report) => (
                            <div key={report.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <StatusBadge status={report.status as any} />
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  report.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                                  report.urgency === 'high' ? 'bg-status-reported/10 text-status-reported' :
                                  'bg-muted text-muted-foreground'
                                )}>
                                  {report.urgency.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-sm mb-2">{report.description}</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {report.location.address}
                                </p>
                                <p>Reported: {new Date(report.reportedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No rescue operations data available</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
