import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export default function DonationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalDonations: 0, totalAmount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const sessionId = searchParams.get('session_id');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    // Fetch donation stats
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/donations/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || { totalDonations: 0, totalAmount: 0 });
        }
      } catch (e) {
        // Ignore errors
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();

    // Handle payment success
    if (sessionId) {
      verifyPayment();
    }

    // Handle cancellation
    if (canceled) {
      toast({
        title: 'Payment Cancelled',
        description: 'Your donation was cancelled. You can try again anytime.',
        variant: 'default',
      });
    }
  }, [sessionId, canceled]);

  const verifyPayment = async () => {
    try {
      const res = await fetch(`${API_URL}/donations/success?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast({
            title: 'Thank You!',
            description: `Your donation of $${data.amount} ${data.currency?.toUpperCase()} was successful!`,
            variant: 'default',
          });
          // Refresh stats
          const statsRes = await fetch(`${API_URL}/donations/stats`);
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData.stats || stats);
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  };

  const presetAmounts = [10, 25, 50, 100, 250, 500];

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const donationAmount = customAmount ? parseFloat(customAmount) : parseFloat(amount);
    
    if (!donationAmount || donationAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please select or enter a valid donation amount.',
        variant: 'destructive',
      });
      return;
    }

    if (donationAmount < 1) {
      toast({
        title: 'Minimum Amount',
        description: 'Minimum donation amount is $1.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/donations/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: donationAmount,
          currency: 'usd',
          donorName: donorName.trim() || undefined,
          donorEmail: donorEmail.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Failed to create donation session');
      }

      const data = await res.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process donation. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Heart className="w-8 h-8 text-primary" fill="currentColor" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Support Our Mission
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your donation helps us rescue, treat, and rehome street dogs across Nepal. 
            Every contribution makes a difference in a dog's life.
          </p>
        </div>

        {/* Stats */}
        {!loadingStats && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Raised</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Heart className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stats.totalDonations}</div>
                <div className="text-sm text-muted-foreground">Donations</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Donation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Make a Donation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDonate} className="space-y-6">
                {/* Amount Selection */}
                <div className="space-y-3">
                  <Label>Donation Amount (USD)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {presetAmounts.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={amount === preset.toString() ? 'default' : 'outline'}
                        onClick={() => {
                          setAmount(preset.toString());
                          setCustomAmount('');
                        }}
                        className="h-12"
                      >
                        ${preset}
                      </Button>
                    ))}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Or enter custom amount"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setAmount('');
                      }}
                      min="1"
                      step="0.01"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Donor Info (Optional) */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Your Name (Optional)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll send you a receipt via email
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Leave a message with your donation..."
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading || (!amount && !customAmount)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      Donate Now
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How Your Donation Helps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Medical Care</h4>
                    <p className="text-sm text-muted-foreground">
                      Vaccinations, sterilization, and treatment for rescued dogs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Rescue Operations</h4>
                    <p className="text-sm text-muted-foreground">
                      Supporting rescue teams and emergency response
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Shelter & Food</h4>
                    <p className="text-sm text-muted-foreground">
                      Providing safe shelter and nutritious food
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Adoption Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Helping dogs find their forever homes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Secure Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      All donations are processed securely through Stripe. 
                      Your payment information is never stored on our servers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
