import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/forgot-password', { email });
      setStatus('If an account exists, a reset link has been sent.');
      toast({ title: 'Reset sent', description: 'If an account exists, a reset link has been sent to that email.' });
    } catch (err) {
      setStatus('Failed to send reset link');
      toast({ title: 'Failed', description: 'Failed to send reset link', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
      <form onSubmit={submit}>
        <label className="block mb-2">Email</label>
        <input className="w-full p-2 border" value={email} onChange={e => setEmail(e.target.value)} />
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white" type="submit" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Reset Link'}</button>
      </form>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}
