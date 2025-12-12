import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuthState } from "@/lib/auth";
import { Clock, CheckCircle, XCircle, LogIn, LogOut } from "lucide-react";
import { Attendance } from "@shared/schema";

export default function AttendanceTracker() {
  const [monthFilter, setMonthFilter] = useState("current");
  const { employee } = useAuthState();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayAttendance } = useQuery<Attendance>({
    queryKey: [`/api/attendance/today/${employee?.employeeId}`],
    enabled: !!employee?.employeeId,
  });

  const { data: attendanceHistory = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", employee?.employeeId, monthFilter],
    queryFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/attendance?employeeId=${employee?.employeeId}&month=${monthFilter}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch attendance history');
      }
      return response.json();
    },
    enabled: !!employee?.employeeId,
  });

  const punchInMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/punch-in");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: [`/api/attendance/today/${employee?.employeeId}`] });
      toast({
        title: "Success",
        description: "Punched in successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to punch in",
        variant: "destructive",
      });
    },
  });

  const punchOutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/attendance/punch-out");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: [`/api/attendance/today/${employee?.employeeId}`] });
      toast({
        title: "Success",
        description: "Punched out successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to punch out",
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateHoursWorked = () => {
    // Sum totalHours of today's attendance history (attendanceHistory may contain multiple entries per day)
    if (!Array.isArray(attendanceHistory) || attendanceHistory.length === 0) return "0h 0m";

    const today = new Date();
    today.setHours(0,0,0,0);

    let totalMs = 0;
    attendanceHistory.forEach((rec: Attendance) => {
      const recDate = new Date(rec.date);
      recDate.setHours(0,0,0,0);
      if (recDate.getTime() === today.getTime()) {
        if (rec.punchIn && rec.punchOut) {
          const inT = new Date(rec.punchIn).getTime();
          const outT = new Date(rec.punchOut).getTime();
          totalMs += Math.max(0, outT - inT);
        } else if (rec.punchIn && !rec.punchOut) {
          totalMs += Math.max(0, Date.now() - new Date(rec.punchIn).getTime());
        }
      }
    });

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Build today's attendance records from attendanceHistory
  const todaysRecords = Array.isArray(attendanceHistory)
    ? attendanceHistory
        .filter((rec: Attendance) => {
          const recDate = new Date(rec.date);
          const today = new Date();
          recDate.setHours(0,0,0,0);
          today.setHours(0,0,0,0);
          return recDate.getTime() === today.getTime();
        })
        .sort((a: Attendance, b: Attendance) => {
          // sort by createdAt or punchIn (safely handle nulls)
          const aTime = (a.punchIn ? new Date(a.punchIn).getTime() : (a.createdAt ? new Date((a as any).createdAt).getTime() : Date.now()));
          const bTime = (b.punchIn ? new Date(b.punchIn).getTime() : (b.createdAt ? new Date((b as any).createdAt).getTime() : Date.now()));
          return aTime - bTime;
        })
    : [];

  const earliestPunchIn = todaysRecords.length ? todaysRecords[0].punchIn : (todayAttendance?.punchIn || null);
  const latestPunchOut = todaysRecords.length ? (todaysRecords.slice().reverse().find(r => r.punchOut)?.punchOut || null) : (todayAttendance?.punchOut || null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Determine punch availability based on latest todayAttendance (latest record for today)
  const canPunchIn = !todayAttendance || !!todayAttendance.punchOut; // allow punch-in if no record or last one is closed
  const canPunchOut = !!todayAttendance && !!todayAttendance.punchIn && !todayAttendance.punchOut;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground mb-4 sm:mb-0">Attendance Management</h2>
        <div className="flex space-x-3">
          <Button
            onClick={() => punchInMutation.mutate()}
            disabled={!canPunchIn || punchInMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
            data-testid="button-punch-in"
          >
            <LogIn className="w-4 h-4" />
            <span>Punch In</span>
          </Button>
          <Button
            onClick={() => punchOutMutation.mutate()}
            disabled={!canPunchOut || punchOutMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            data-testid="button-punch-out"
          >
            <LogOut className="w-4 h-4" />
            <span>Punch Out</span>
          </Button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Check-in Time</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-checkin-time">
                  {earliestPunchIn ? formatTime(earliestPunchIn) : '--:--'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <LogIn className="text-green-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Check-out Time</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-checkout-time">
                  {latestPunchOut ? formatTime(latestPunchOut) : '--:--'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <LogOut className="text-red-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-hours-worked">
                  {calculateHoursWorked()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-blue-600 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-attendance-status">
                  {todayAttendance && todayAttendance.status ? todayAttendance.status : 'Not Checked In'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                {todayAttendance && todayAttendance.status === 'present' ? (
                  <CheckCircle className="text-green-600 text-xl" />
                ) : (
                  <XCircle className="text-red-600 text-xl" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground mb-4 sm:mb-0">Attendance History</h3>
            <div className="flex space-x-3">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-48" data-testid="select-month-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {!Array.isArray(attendanceHistory) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                    Error loading attendance records
                  </td>
                </tr>
              ) : attendanceHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendanceHistory.map((record: Attendance) => (
                  <tr key={record.id} data-testid={`row-attendance-${record.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {record.punchIn ? formatTime(record.punchIn) : '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {record.punchOut ? formatTime(record.punchOut) : '--:--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {record.totalHours ? `${parseFloat(record.totalHours).toFixed(1)}h` : '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status || 'unknown')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Today's Punches (detailed list) */}
      {todaysRecords.length > 0 && (
        <Card>
          <div className="p-6">
            <h4 className="text-md font-semibold mb-3">Today's Punches</h4>
            <div className="space-y-2">
              {todaysRecords.map((r: Attendance) => (
                <div key={r.id} className="flex justify-between items-center p-2 bg-muted rounded">
                  <div>
                    <div className="text-sm font-medium">Punch In: {r.punchIn ? formatTime(r.punchIn) : '--:--'}</div>
                    <div className="text-xs text-muted-foreground">Punch Out: {r.punchOut ? formatTime(r.punchOut) : '--:--'}</div>
                  </div>
                  <div className="text-sm">
                    {r.totalHours ? `${parseFloat(r.totalHours).toFixed(2)}h` : (r.punchIn && !r.punchOut ? 'Open' : '--')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
