import React, { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Clock } from 'lucide-react';
import { useAuthState } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function PermissionRequestForm() {
    const { employee } = useAuthState();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        permissionDate: '',
        duration: '1', // 1 hour or 2 hours
        reason: '',
    });

    // Fetch current month's usage from API
    const { data: permissionUsage } = useQuery({
        queryKey: ['/api/permission-requests/usage', employee?.employeeId],
        queryFn: async () => {
            if (!employee?.employeeId) return { totalAllowance: 2, used: 0, remaining: 2 };
            const res = await apiRequest('GET', '/api/permission-requests/usage');
            if (!res.ok) {
                // If API call fails, return default values
                return { totalAllowance: 2, used: 0, remaining: 2 };
            }
            return res.json();
        },
        enabled: !!employee?.employeeId,
        // Provide initial data to prevent UI flickering if employee is not yet loaded
        initialData: { totalAllowance: 2, used: 0, remaining: 2 },
    });

    const getCurrentMonth = () => {
        const now = new Date();
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const permissionMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const token = localStorage.getItem("auth_token");
            if (!token) {
                throw new Error("Not authenticated");
            }

            const response = await fetch('/api/permission-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    permissionDate: data.permissionDate,
                    duration: parseInt(data.duration),
                    reason: data.reason,
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to submit permission request');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/permission-requests'] });
            queryClient.invalidateQueries({ queryKey: ['/api/permission-requests/usage'] });
            toast({
                title: "Success",
                description: "Permission request submitted successfully",
            });
            setFormData({
                permissionDate: '',
                duration: '1',
                reason: '',
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to submit permission request",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.permissionDate) {
            toast({
                title: "Error",
                description: "Please select a permission date",
                variant: "destructive",
            });
            return;
        }

        if (!formData.reason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a reason for your permission request",
                variant: "destructive",
            });
            return;
        }

        const requestedHours = parseInt(formData.duration);

        // Frontend check if user has enough remaining hours (for better UX)
        if (permissionUsage && permissionUsage.remaining < requestedHours) {
            toast({
                title: "Monthly Limit Exceeded",
                description: `You only have ${permissionUsage.remaining} hour(s) remaining this month. You cannot request ${requestedHours} hour(s).`,
                variant: "destructive",
            });
            return;
        }

        permissionMutation.mutate(formData);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Section - Blue background like in the image */}
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">2-Hour Permission Request</h3>
                            <p className="text-sm text-blue-100">Monthly allowance: 2 hours (resets every month)</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-blue-100 font-medium">{getCurrentMonth()}</p>
                        <p className="text-lg font-bold text-white">
                            <span className="text-green-300">{permissionUsage.remaining}h</span> remaining
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Permission Date</label>
                        <Input
                            type="date"
                            value={formData.permissionDate}
                            onChange={(e) => setFormData({ ...formData, permissionDate: e.target.value })}
                            required
                            className="h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Duration</label>
                        <Select
                            value={formData.duration}
                            onValueChange={(value) => setFormData({ ...formData, duration: value })}
                        >
                            <SelectTrigger className="h-12 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Hour</SelectItem>
                                <SelectItem value="2">2 Hours</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                            You can use permission across multiple days (e.g., 1 hour today + 1 hour another day) or all at once (2 hours in one day).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Reason</label>
                        <Textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            required
                            rows={3}
                            placeholder="Please provide a reason for your permission request..."
                            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {/* Monthly Usage Summary - Light blue background like in image */}
                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                        <h4 className="text-base font-semibold text-indigo-900 mb-4">Monthly Usage Summary</h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-indigo-600 font-medium mb-1">Total Allowance</p>
                                <p className="text-2xl font-bold text-indigo-700">{permissionUsage.totalAllowance} hours</p>
                            </div>
                            <div>
                                <p className="text-xs text-indigo-600 font-medium mb-1">Used</p>
                                <p className="text-2xl font-bold text-orange-600">{permissionUsage.used} hours</p>
                            </div>
                            <div>
                                <p className="text-xs text-indigo-600 font-medium mb-1">Remaining</p>
                                <p className="text-2xl font-bold text-green-600">{permissionUsage.remaining} hours</p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button - Matching the blue style */}
                    <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-base font-semibold shadow-md"
                        disabled={permissionMutation.isPending}
                    >
                        <Clock className="w-5 h-5 mr-2" />
                        {permissionMutation.isPending ? "Submitting..." : "Submit Permission Request"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
