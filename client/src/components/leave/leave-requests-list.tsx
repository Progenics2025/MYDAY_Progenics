import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, CheckCircle, XCircle, AlertCircle, Calendar, FileText, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function LeaveRequestsList() {
  const { user } = useAuthState();
  const isAdminView = !!(user && ['admin', 'manager'].includes(((user.role || '') as string).toLowerCase()));
  const endpointBase = isAdminView ? '/api/notify/leave-requests/list' : '/api/notify/leave-requests/me';
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [approvingMap, setApprovingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const queryKey = useMemo(() => [endpointBase, page, pageSize, statusFilter, debouncedQ], [endpointBase, page, pageSize, statusFilter, debouncedQ]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedQ) params.set('q', debouncedQ);
      const url = `${endpointBase}?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch leave requests');
      return res.json();
    }
  });

  const rawItems = Array.isArray(data) ? data as any[] : (Array.isArray((data as any)?.items) ? (data as any).items : []);
  const items = rawItems.map((r: any) => ({
    id: r.id || r.id,
    employeeId: r.employeeId || r.employee_id,
    employeeName: r.employeeName || r.employee_name,
    leaveType: r.leaveType || r.leave_type,
    startDate: r.startDate || r.start_date,
    endDate: r.endDate || r.end_date,
    totalDays: r.totalDays || r.total_days,
    reason: r.reason,
    documentUrl: r.documentUrl || r.document_url || null,
    status: r.status,
  }));
  const total = (data && (data.total || 0)) || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleAction = async (action: 'approve' | 'notify', request: any) => {
    try {
      if (action === 'approve') setApprovingMap((s) => ({ ...s, [request.id]: true }));

      const token = localStorage.getItem('auth_token');
      const empRes = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } });
      if (!empRes.ok) throw new Error('Failed to load employees');
      const empList = await empRes.json();
      const mgr = empList.find((e: any) => (e.role || '').toLowerCase().includes('manager'));
      const managerId = mgr ? (mgr.userId || mgr.id) : null;

      if (!managerId) {
        toast({ title: "Error", description: "No manager found to process request", variant: "destructive" });
        return;
      }

      if (action === 'notify') {
        const notifyResp = await fetch('/api/notify/leave-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ leaveRequestId: request.id, managerId })
        });
        if (!notifyResp.ok) throw new Error('Notify failed');
        toast({ title: "Success", description: "Manager notified successfully" });
      } else {
        // Create notification first
        const createRes = await fetch('/api/notify/leave-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ leaveRequestId: request.id, managerId })
        });
        if (!createRes.ok) throw new Error('Failed to create notification');
        const createData = await createRes.json();

        // Then approve
        const approveRes = await fetch(`/api/notify/leave-requests/${createData.notificationId}/approve`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!approveRes.ok) throw new Error('Approve failed');
        toast({ title: "Success", description: "Leave request approved" });
      }

      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Action failed", variant: "destructive" });
    } finally {
      if (action === 'approve') setApprovingMap((s) => { const n = { ...s }; delete n[request.id]; return n; });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Leave Requests
            </CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track leave applications</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 w-[200px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Leave Type</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Dates</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 mb-2 opacity-20" />
                      <p>No leave requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-white">{item.employeeName}</div>
                      <div className="text-xs text-slate-500">ID: {item.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal bg-slate-50">
                        {item.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.totalDays}</span>
                      <span className="text-slate-500 ml-1">days</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                        {format(new Date(item.startDate), 'MMM d')} - {format(new Date(item.endDate), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-slate-600 dark:text-slate-300" title={item.reason}>
                        {item.reason}
                      </p>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      {isAdminView && item.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            onClick={() => handleAction('notify', item)}
                            title="Notify Manager"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                            onClick={() => handleAction('approve', item)}
                            disabled={approvingMap[item.id]}
                          >
                            {approvingMap[item.id] ? '...' : 'Approve'}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-sm text-slate-500">
            Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8"
            >
              Previous
            </Button>
            <div className="text-sm font-medium px-2">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
