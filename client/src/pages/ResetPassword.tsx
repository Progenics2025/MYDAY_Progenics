import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!token) {
      toast({ title: 'Missing token', description: 'Reset token is missing from the URL', variant: 'destructive' });
      return;
    }
    if (!password || password.length < 8) {
      toast({ title: 'Weak password', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/reset-password', { token, newPassword: password });
      setStatus('Password reset successful. Redirecting to login...');
      toast({ title: 'Success', description: 'Password reset successful' });
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } catch (err) {
      setStatus('Failed to reset password');
      toast({ title: 'Failed', description: 'Failed to reset password', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
      <form onSubmit={submit}>
        <label className="block mb-2">New password</label>
        <input className="w-full p-2 border" value={password} onChange={e => setPassword(e.target.value)} type="password" />
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white" type="submit">Reset Password</button>
      </form>
      {status && <p className="mt-4">{status}</p>}
    </div>
  );
}
