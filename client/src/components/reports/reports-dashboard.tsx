import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { exportReport } from "@/lib/reports";
import { Download, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartPieChart, Pie, Cell } from 'recharts';

interface DepartmentStats {
  department: string;
  employeeCount: number;
  attendanceRate: number;
  total: number;
  present: number;
  absent: number;
  late: number;
  totalHours: string;
  averageHours: string;
}

interface AttendanceData {
  date: string;
  employeeId: string;
  employeeName: string;
  department: string;
  status: 'present' | 'absent' | 'late';
  totalHours: number | null;
}

interface DailyStats {
  present: number;
  absent: number;
  late: number;
}

interface DailyChartData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface DepartmentChartData {
  name: string;
  value: number;
}

interface Stats {
  avgAttendance: string;
  onTimeRate: string;
  avgHours: string;
  totalEmployees: number;
}

interface ReportData {
  attendance: AttendanceData[];
  departmentStats: DepartmentStats[];
}

export default function ReportsDashboard() {
  const [reportType, setReportType] = useState("attendance");
  const [dateRange, setDateRange] = useState("current");
  const [department, setDepartment] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [format, setFormat] = useState("pdf");

  const getDateRange = useCallback(() => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (dateRange) {
      case 'current':
        start.setDate(1); // Start of current month
        break;
      case 'last':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(1);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [dateRange]);

  const { data: reportData, isError: reportError } = useQuery({
    queryKey: ['/api/reports', reportType, dateRange, department],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error('Authentication required');
      }
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({
        startDate,
        endDate,
        department: department || 'all'
      });

      const response = await fetch(`/api/reports/${reportType}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to fetch report data');
      }
      return response.json();
    },
    retry: false
  });

  const { data: deptStats, isError: deptStatsError } = useQuery({
    queryKey: ['/api/reports/department-stats', dateRange],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error('Authentication required');
      }
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams({ startDate, endDate });

      const response = await fetch(`/api/reports/department-stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to fetch department statistics');
      }
      return response.json();
    }
  });

  const handleExportReport = () => {
    if (!reportData) {
      alert('No data available for the selected filters');
      return;
    }

    // Normalize data: some endpoints return objects (attendance + stats), others return arrays
    let exportData: any = reportData;
    if (reportType === 'attendance' && reportData.attendance) {
      exportData = reportData.attendance;
    }
    // employee and payroll endpoints return arrays already

    if (!Array.isArray(exportData)) {
      console.warn('Export data is not an array, converting to array:', exportData);
      exportData = Array.isArray(exportData) ? exportData : [exportData];
    }

    exportReport(exportData, reportType, dateRange, department || 'all', format);
  };

  const handleDownloadAttendanceCsv = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return alert('Not authenticated');
    const { startDate, endDate } = getDateRange();
    const params = new URLSearchParams({ from: startDate, to: endDate, format: 'csv' });
    const response = await fetch(`/api/attendance/report?${params}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) return alert('Failed to download CSV');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Calculate stats from report data
  const stats = useMemo(() => {
    if (!reportData || !deptStats) return {
      avgAttendance: "0",
      onTimeRate: "0",
      avgHours: "0",
      totalEmployees: 0
    };

    const totalAttendance = deptStats.reduce((sum: number, dept: DepartmentStats) => sum + dept.total, 0);
    const totalPresent = deptStats.reduce((sum: number, dept: DepartmentStats) => sum + dept.present, 0);
    const totalEmployees = deptStats.reduce((sum: number, dept: DepartmentStats) => sum + dept.employeeCount, 0);
    const totalHours = deptStats.reduce((sum: number, dept: DepartmentStats) => sum + parseFloat(dept.totalHours || '0'), 0);

    return {
      avgAttendance: totalAttendance > 0 ? ((totalPresent / totalAttendance) * 100).toFixed(1) : "0",
      onTimeRate: totalAttendance > 0 ? ((totalPresent / totalAttendance) * 100).toFixed(1) : "0",
      avgHours: totalAttendance > 0 ? (totalHours / totalAttendance).toFixed(1) : "0",
      totalEmployees
    };
  }, [reportData, deptStats]);

  const leaveRequests = reportData?.attendance?.filter((att: AttendanceData) => att.status === 'absent').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground mb-4 sm:mb-0">Reports & Analytics</h2>
        <Button
          onClick={handleExportReport}
          className="flex items-center space-x-2"
          data-testid="button-export-report"
          disabled={reportError || deptStatsError}
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </Button>
      </div>

      {(reportError || deptStatsError) && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <p className="text-sm">There was an error loading the report data. Please make sure you're logged in and try again.</p>
        </div>
      )}

      {/* Report Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance Report</SelectItem>
                  <SelectItem value="payroll">Payroll Report</SelectItem>
                  <SelectItem value="employee">Employee Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="it">Information Technology</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Employee Name</Label>
              <Input
                placeholder="Filter by name..."
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger data-testid="select-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Attendance Trends</h3>
            {reportType === 'attendance' && (
              <div className="flex items-center justify-end mb-4">
                <Button onClick={handleDownloadAttendanceCsv} className="mr-2">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={useMemo(() => {
                    if (!reportData?.attendance) return [];

                    const grouped = reportData.attendance.reduce((acc: Record<string, DailyStats>, curr: AttendanceData) => {
                      const date = new Date(curr.date).toLocaleDateString();
                      if (!acc[date]) {
                        acc[date] = { present: 0, absent: 0, late: 0 };
                      }
                      acc[date][curr.status]++;
                      return acc;
                    }, {});

                    return Object.entries<DailyStats>(grouped).map(([date, stats]): DailyChartData => ({
                      date,
                      present: stats.present,
                      absent: stats.absent,
                      late: stats.late
                    }));
                  }, [reportData?.attendance])}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill="#22c55e" name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                  <Bar dataKey="late" fill="#f59e0b" name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartPieChart>
                  <Pie
                    data={useMemo(() => {
                      if (!deptStats) return [];

                      return deptStats.map((dept: DepartmentStats): DepartmentChartData => ({
                        name: dept.department,
                        value: dept.employeeCount
                      }));
                    }, [deptStats])}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {useMemo(() => {
                      const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
                      return deptStats?.map((_: DepartmentStats, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ));
                    }, [deptStats])}
                  </Pie>
                  <Tooltip />
                </RechartPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance table for detail */}
      {reportType === 'attendance' && reportData?.attendance && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">Attendance Details</h3>
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punch In</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punch Out</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.attendance
                    .filter((r: any) => !employeeFilter || (r.employeeName || '').toLowerCase().includes(employeeFilter.toLowerCase()))
                    .map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{r.employeeName || r.employeeId}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.punchIn ? new Date(r.punchIn).toLocaleString() : ''}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.punchOut ? new Date(r.punchOut).toLocaleString() : ''}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.totalHours ?? ''}</td>
                        <td className="px-6 py-3 text-sm text-gray-700 max-w-xs truncate" title={r.punchInLocation?.address || ''}>{r.punchInLocation?.address || '--'}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.date || (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '')}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Report Table */}
      {reportType === 'payroll' && reportData && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">Payroll Details</h3>
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Date</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(Array.isArray(reportData) ? reportData : [])
                    .filter((r: any) => !employeeFilter || (r.employeeName || '').toLowerCase().includes(employeeFilter.toLowerCase()))
                    .map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{r.employeeName || r.employeeId}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{r.department}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{r.role}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">₹{r.basicSalary?.toLocaleString() ?? 0}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">₹{r.netSalary?.toLocaleString() ?? 0}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{r.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Report Table */}
      {reportType === 'employee' && reportData && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">Employee Details</h3>
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Join Date</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(Array.isArray(reportData) ? reportData : [])
                    .filter((r: any) => !employeeFilter || (r.employeeName || '').toLowerCase().includes(employeeFilter.toLowerCase()))
                    .map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{r.employeeName || r.employeeId}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{r.department}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{r.role}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.joinDate ? new Date(r.joinDate).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 capitalize">{r.status}</td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">{r.attendanceStats?.attendanceRate?.toFixed(1)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-avg-attendance">
                {stats?.avgAttendance ?? '0'}%
              </div>
              <div className="text-sm text-muted-foreground">Avg. Attendance</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="text-ontime-rate">
                {stats?.onTimeRate ?? '0'}%
              </div>
              <div className="text-sm text-muted-foreground">On-time Rate</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600" data-testid="text-avg-hours">
                {stats?.avgHours ?? '0'}h
              </div>
              <div className="text-sm text-muted-foreground">Avg. Daily Hours</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-employees">
                {stats?.totalEmployees ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Employees</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
