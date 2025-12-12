import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Calendar, Users, CheckCircle, XCircle } from "lucide-react";
import AttendanceTracker from "./attendance-tracker";
import GPSPunch from "./gps-punch";
import LeaveRequestForm from "../leave/leave-request-form";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "@/lib/auth";
// Removed duplicate import of useQuery

const formatTime = (date?: string | Date | null) => {
    if (!date) return '--:--';
    try {
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) { return '--:--'; }
}

const computeHours = (records: any[] = []) => {
    let totalMs = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    records.forEach(r => {
        const recDate = new Date(r.date);
        recDate.setHours(0, 0, 0, 0);
        if (recDate.getTime() !== today.getTime()) return;
        if (r.punchIn && r.punchOut) {
            totalMs += Math.max(0, new Date(r.punchOut).getTime() - new Date(r.punchIn).getTime());
        } else if (r.punchIn && !r.punchOut) {
            totalMs += Math.max(0, Date.now() - new Date(r.punchIn).getTime());
        }
    });
    const hours = (totalMs / (1000 * 60 * 60));
    // show decimal hours with one decimal place
    return hours ? Number(hours.toFixed(1)) : 0;
}

export default function AttendancePage() {
    const [activeTab, setActiveTab] = useState("punch");
    const { employee } = useAuthState();

    const { data: attendanceHistory = [] } = useQuery({
        queryKey: ["/api/attendance", employee?.employeeId, 'current'],
        queryFn: async () => {
            if (!employee?.employeeId) return [];
            const res = await apiRequest('GET', `/api/attendance?employeeId=${employee.employeeId}&month=current`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!employee?.employeeId,
    });

    // derive today's records from attendanceHistory (same logic as AttendanceTracker)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaysRecords = Array.isArray(attendanceHistory)
        ? attendanceHistory.filter((rec: any) => { const d = new Date(rec.date); d.setHours(0, 0, 0, 0); return d.getTime() === today.getTime(); })
        : [];

    const sortedToday = todaysRecords.slice().sort((a: any, b: any) => {
        const aTime = a.punchIn ? new Date(a.punchIn).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.punchIn ? new Date(b.punchIn).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return aTime - bTime;
    });

    const earliest = sortedToday.length ? (sortedToday[0].punchIn || sortedToday[0].createdAt) : null;
    const latest = sortedToday.length ? (sortedToday.slice().reverse().find((r: any) => r.punchOut)?.punchOut || null) : null;
    const hoursToday = computeHours(todaysRecords);

    // Leave balances
    const { data: leaveBalances } = useQuery({
        queryKey: ["/api/leave-balances", employee?.employeeId],
        queryFn: async () => {
            if (!employee?.employeeId) return { casualLeave: 12, sickLeave: 12, earnedLeave: 15 };
            const res = await apiRequest('GET', `/api/leave-balances/${employee.employeeId}`);
            if (!res.ok) return { casualLeave: 12, sickLeave: 12, earnedLeave: 15 };
            return res.json();
        },
        enabled: !!employee?.employeeId,
    });

    const cl = leaveBalances?.casualLeave ?? 12;
    const sl = leaveBalances?.sickLeave ?? 12;
    const el = leaveBalances?.earnedLeave ?? 15;
    const totalLeaves = cl + sl + el;

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Today's Status</p>
                                <p className="text-xl md:text-2xl font-bold text-blue-900">{sortedToday.length ? 'Present' : 'Not Checked In'}</p>
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                <CheckCircle className="text-white w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        </div>
                        <div className="mt-3 text-xs md:text-sm text-blue-700">
                            <p>In: {formatTime(earliest)} • Out: {formatTime(latest)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">Hours Today</p>
                                <p className="text-xl md:text-2xl font-bold text-green-900">{hoursToday}</p>
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600 rounded-lg flex items-center justify-center">
                                <Clock className="text-white w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        </div>
                        <div className="mt-3 text-xs md:text-sm text-green-700">
                            <p>Target: 8 hours</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 font-medium">Leave Balance</p>
                                <p className="text-xl md:text-2xl font-bold text-purple-900">{totalLeaves}</p>
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                                <Calendar className="text-white w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        </div>
                        <div className="mt-3 text-xs md:text-sm text-purple-700">
                            <p>Total: {totalLeaves} · CL: {cl} · SL: {sl} · EL: {el}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Tabs */}
            <Card className="overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="border-b border-gray-200 px-4 md:px-6 pt-4 md:pt-6">
                        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-gray-100">
                            <TabsTrigger
                                value="punch"
                                className="flex flex-col items-center gap-1 py-3 px-2 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600"
                            >
                                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="hidden sm:inline">GPS Punch</span>
                                <span className="sm:hidden">Punch</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="tracker"
                                className="flex flex-col items-center gap-1 py-3 px-2 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600"
                            >
                                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="hidden sm:inline">Time Tracker</span>
                                <span className="sm:hidden">Time</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="leave"
                                className="flex flex-col items-center gap-1 py-3 px-2 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600"
                            >
                                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="hidden sm:inline">Leave Requests</span>
                                <span className="sm:hidden">Leave</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="punch" className="p-4 md:p-6 mt-0">
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="text-lg md:text-xl font-semibold text-gray-900">GPS Attendance</h3>
                                <p className="text-sm text-gray-600">Mark your attendance with location tracking</p>
                            </div>
                            <GPSPunch />
                        </div>
                    </TabsContent>

                    <TabsContent value="tracker" className="p-4 md:p-6 mt-0">
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Attendance History</h3>
                                <p className="text-sm text-gray-600">View and manage attendance records</p>
                            </div>
                            <AttendanceTracker />
                        </div>
                    </TabsContent>

                    <TabsContent value="leave" className="p-4 md:p-6 mt-0">
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Leave Management</h3>
                                <p className="text-sm text-gray-600">Request and track your leave applications</p>
                            </div>
                            <LeaveRequestForm />
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
