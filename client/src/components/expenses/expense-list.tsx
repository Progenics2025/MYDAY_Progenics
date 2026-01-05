import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/lib/auth';
import { Button } from '../ui/button';

export default function ExpenseList() {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const endpointBase = (user && (user.role === 'admin' || user.role === 'manager')) ? '/api/expenses/all' : '/api/expenses';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // use debouncedQ in the query key so we don't refetch on every keystroke
  const queryKey = useMemo(() => [endpointBase, page, pageSize, statusFilter, debouncedQ], [endpointBase, page, pageSize, statusFilter, debouncedQ]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedQ) params.set('q', debouncedQ);
      const url = `${endpointBase}?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    },
  // keepPreviousData was removed to satisfy project TS types; pagination handled by state
  });

  // debounce q -> debouncedQ
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1); // reset to first page when search changes
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  const handleApprove = async (expenseId: string) => {
    setApprovingId(expenseId);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/expenses/${expenseId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve expense');
      }

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [endpointBase, page, pageSize, statusFilter, debouncedQ] as any });
    } catch (error: any) {
      alert(`Error approving expense: ${error.message}`);
      console.error('Error approving expense:', error);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (expenseId: string) => {
    setApprovingId(expenseId);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/expenses/${expenseId}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject expense');
      }

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: [endpointBase, page, pageSize, statusFilter, debouncedQ] as any });
    } catch (error: any) {
      alert(`Error rejecting expense: ${error.message}`);
      console.error('Error rejecting expense:', error);
    } finally {
      setApprovingId(null);
    }
  };

  if (isLoading) return <div>Loading expenses...</div>;
  if (error) return <div>Error loading expenses</div>;

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">Manage expense submissions and approvals</p>
        </div>
        <div className="flex items-center space-x-3">
          {isFetching && !isLoading && <div className="text-sm text-muted-foreground">Updating…</div>}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or category" className="border px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border px-3 py-2 rounded-md shadow-sm">
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border px-3 py-2 rounded-md shadow-sm">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted-2">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {items.map((exp: any) => (
                <tr key={exp.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-foreground truncate">{exp.employeeName || exp.employeeId || exp.employee?.employeeId || exp.employee?.firstName}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{exp.category}</td>
                  <td className="px-4 py-3 text-sm text-foreground text-right">₹{Number(exp.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    {exp.status === 'pending' && (user?.role === 'admin' || user?.role === 'manager') ? (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleApprove(exp.id)}
                          disabled={approvingId === exp.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {approvingId === exp.id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleReject(exp.id)}
                          disabled={approvingId === exp.id}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${exp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : exp.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {exp.status === 'pending' ? 'Pending' : exp.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {exp.receiptUrl || exp.receipt_url ? (
                      <a className="text-blue-600 hover:underline" href={exp.receiptUrl || exp.receipt_url} target="_blank" rel="noreferrer">View</a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-muted">
          <div className="text-sm text-muted-foreground">Showing {(page-1)*pageSize+1} - {Math.min(page*pageSize, total)} of {total}</div>
          <div className="flex items-center space-x-2">
            <button disabled={page<=1} onClick={() => setPage(1)} className="px-2 py-1 rounded border bg-white text-sm disabled:opacity-50">First</button>
            <button disabled={page<=1} onClick={() => setPage((p) => Math.max(1, p-1))} className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50">Prev</button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button disabled={page>=totalPages} onClick={() => setPage((p) => Math.min(totalPages, p+1))} className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50">Next</button>
            <button disabled={page>=totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 rounded border bg-white text-sm disabled:opacity-50">Last</button>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border px-2 py-1 rounded text-sm">
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
            </select>
          </div>
        </div>
      </div>
      {items.length === 0 && !isLoading && <div className="p-6 text-center text-sm text-muted-foreground">No expenses found.</div>}
    </div>
  );
}
