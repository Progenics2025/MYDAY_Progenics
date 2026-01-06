import React, { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Calendar } from 'lucide-react';
import { useAuthState } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface LeaveBalances {
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
}

export default function LeaveRequestForm() {
  const { employee } = useAuthState();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    leaveType: '',
    reason: '',
    document: null as File | null,
    isHalfDay: false,
    halfDayDuration: '1.0', // Default to full day
  });

  const [formErrors, setFormErrors] = useState({
    startDate: '',
    endDate: '',
    leaveType: '',
    reason: '',
  });

  // Fetch leave balances
  const { data: leaveBalances } = useQuery<LeaveBalances>({
    queryKey: ['/api/leave-balances', employee?.employeeId],
    queryFn: async () => {
      if (!employee?.employeeId) return { casualLeave: 0, sickLeave: 0, earnedLeave: 0 };
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/leave-balances/${employee.employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch leave balances');
      return res.json();
    },
    enabled: !!employee?.employeeId,
  });

  // Helper to get balance for a leave type
  const getBalanceForType = (type: string): number => {
    if (!leaveBalances) return 0;
    switch (type) {
      case 'casual': return leaveBalances.casualLeave || 0;
      case 'sick': return leaveBalances.sickLeave || 0;
      case 'earned': return leaveBalances.earnedLeave || 0;
      default: return 0;
    }
  };

  // Check if a leave type is available (balance > 0)
  const isLeaveTypeAvailable = (type: string): boolean => {
    return getBalanceForType(type) > 0;
  };


  const validateForm = () => {
    const errors = {
      startDate: '',
      endDate: '',
      leaveType: '',
      reason: '',
    };
    let isValid = true;

    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
      isValid = false;
    }

    if (!formData.endDate) {
      errors.endDate = 'End date is required';
      isValid = false;
    } else if (new Date(formData.endDate) < new Date(formData.startDate)) {
      errors.endDate = 'End date cannot be before start date';
      isValid = false;
    }

    if (!formData.leaveType) {
      errors.leaveType = 'Leave type is required';
      isValid = false;
    } else if (!isLeaveTypeAvailable(formData.leaveType)) {
      errors.leaveType = `You have 0 ${formData.leaveType} leave balance available`;
      isValid = false;
    }

    if (!formData.reason.trim()) {
      errors.reason = 'Reason is required';
      isValid = false;
    }

    // If sick leave for more than 2 days, require a document
    if (formData.leaveType === 'sick' && formData.startDate && formData.endDate) {
      const td = calculateTotalDays(formData.startDate, formData.endDate);
      if (td > 2 && !formData.document) {
        errors.reason = 'Medical document is required for sick leave longer than 2 days';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const calculateTotalDays = (start: string, end: string) => {
    // If it's a half day single day request
    if (formData.isHalfDay && start === end) {
      return parseFloat(formData.halfDayDuration);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Including both start and end dates
  };

  const leaveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const totalDays = calculateTotalDays(data.startDate, data.endDate);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Submit leave request
      let leaveResponse: Response;
      if (data.document) {
        const fd = new FormData();
        fd.append('startDate', data.startDate);
        fd.append('endDate', data.endDate);
        fd.append('leaveType', data.leaveType);
        fd.append('reason', data.reason);
        fd.append('totalDays', String(totalDays));
        fd.append('status', 'pending');
        fd.append('employeeId', employee?.employeeId || '');
        fd.append('document', data.document);
        fd.append('isHalfDay', String(data.isHalfDay));
        fd.append('halfDayDuration', data.halfDayDuration);

        leaveResponse = await fetch('/api/leave-requests', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: fd
        });
      } else {
        leaveResponse = await fetch('/api/leave-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            startDate: data.startDate,
            endDate: data.endDate,
            leaveType: data.leaveType,
            reason: data.reason,
            totalDays,
            status: 'pending',
            employeeId: employee?.employeeId,
            isHalfDay: data.isHalfDay,
            halfDayDuration: data.halfDayDuration
          })
        });
      }

      if (!leaveResponse.ok) {
        const error = await leaveResponse.json();
        throw new Error(error.message || 'Failed to submit leave request');
      }

      const leaveData = await leaveResponse.json();
      return leaveData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests'] });
      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });
      setFormData({
        startDate: '',
        endDate: '',
        leaveType: '',
        reason: '',
        document: null,
        isHalfDay: false,
        halfDayDuration: '1.0',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    leaveMutation.mutate(formData);
  };

  // Check if it's a single day request (for half day options)
  const isSingleDay = formData.startDate && formData.endDate && formData.startDate === formData.endDate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Half Day Options - Only show for single day requests */}
          {isSingleDay && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={formData.isHalfDay}
                  onChange={(e) => setFormData({
                    ...formData,
                    isHalfDay: e.target.checked,
                    halfDayDuration: e.target.checked ? '0.5' : '1.0'
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="halfDay" className="text-sm font-medium">
                  This is a half-day leave
                </label>
              </div>

              {formData.isHalfDay && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Duration</label>
                  <Select
                    value={formData.halfDayDuration}
                    onValueChange={(value) => setFormData({ ...formData, halfDayDuration: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5 day (Half Day - 4 hours)</SelectItem>
                      <SelectItem value="1.0">1.0 day (Full Day - 8 hours)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.halfDayDuration === '0.5'
                      ? 'Half Day: 4 hours leave'
                      : 'Full Day: 8 hours leave'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Leave Type</label>
            <Select
              value={formData.leaveType}
              onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="casual"
                  disabled={!isLeaveTypeAvailable('casual')}
                  className={!isLeaveTypeAvailable('casual') ? 'opacity-50' : ''}
                >
                  Casual Leave ({getBalanceForType('casual')} days{!isLeaveTypeAvailable('casual') ? ' - Not available' : ''})
                </SelectItem>
                <SelectItem
                  value="sick"
                  disabled={!isLeaveTypeAvailable('sick')}
                  className={!isLeaveTypeAvailable('sick') ? 'opacity-50' : ''}
                >
                  Sick Leave ({getBalanceForType('sick')} days{!isLeaveTypeAvailable('sick') ? ' - Not available' : ''})
                </SelectItem>
                <SelectItem
                  value="earned"
                  disabled={!isLeaveTypeAvailable('earned')}
                  className={!isLeaveTypeAvailable('earned') ? 'opacity-50' : ''}
                >
                  Earned Leave ({getBalanceForType('earned')} days{!isLeaveTypeAvailable('earned') ? ' - Not available' : ''})
                </SelectItem>
              </SelectContent>
            </Select>
            {formErrors.leaveType && (
              <p className="text-sm text-red-500">{formErrors.leaveType}</p>
            )}
          </div>

          {/* File upload: shown only when sick leave longer than 2 days */}
          {(formData.leaveType === 'sick' && formData.startDate && formData.endDate && calculateTotalDays(formData.startDate, formData.endDate) > 2) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Medical Document</label>
              <Input
                type="file"
                onChange={(e) => setFormData({ ...formData, document: e.target.files ? e.target.files[0] : null })}
                accept="application/pdf,image/*"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={3}
            />
          </div>

          {/* Display calculated total days */}
          {formData.startDate && formData.endDate && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Total leave days: <strong>{calculateTotalDays(formData.startDate, formData.endDate)}</strong>
                {formData.isHalfDay && isSingleDay && (
                  formData.halfDayDuration === '0.5'
                    ? ' (Half Day - 4 hours)'
                    : ' (Full Day - 8 hours)'
                )}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={leaveMutation.isPending}>
            <Calendar className="w-4 h-4 mr-2" />
            {leaveMutation.isPending ? "Submitting..." : "Submit Leave Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}