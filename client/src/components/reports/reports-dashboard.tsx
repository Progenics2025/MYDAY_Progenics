import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { downloadCSVReport } from "@/lib/pdf";
import { Download, BarChart3, PieChart, TrendingUp } from "lucide-react";

export default function ReportsDashboard() {
  const [reportType, setReportType] = useState("attendance");
  const [dateRange, setDateRange] = useState("current");
  const [department, setDepartment] = useState("");
  const [format, setFormat] = useState("pdf");

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
  });

  const { data: payroll = [] } = useQuery<any[]>({
    queryKey: ["/api/payroll"],
  });

  const handleExportReport = () => {
    let data: any[] = [];
    let filename = "";

    switch (reportType) {
      case "attendance":
        data = attendance as any[];
        filename = `attendance-report-${new Date().toISOString().split('T')[0]}`;
        break;
      case "payroll":
        data = payroll as any[];
        filename = `payroll-report-${new Date().toISOString().split('T')[0]}`;
        break;
      case "employee":
        data = employees as any[];
        filename = `employee-report-${new Date().toISOString().split('T')[0]}`;
        break;
    }

    if (format === "csv" && data.length > 0) {
      downloadCSVReport(data, filename);
    } else {
      // For PDF and Excel, we'll just show a message for now
      alert(`${format.toUpperCase()} export functionality would be implemented with appropriate libraries`);
    }
  };

  // Calculate some basic stats
  const avgAttendance = (attendance as any[]).length > 0 ? 
    ((attendance as any[]).filter((att: any) => att.status === 'present').length / (attendance as any[]).length * 100).toFixed(1) : "0";
  
  const onTimeRate = (attendance as any[]).length > 0 ? 
    ((attendance as any[]).filter((att: any) => att.status === 'present').length / (attendance as any[]).length * 100).toFixed(1) : "0";
    
  const avgHours = (attendance as any[]).length > 0 ? 
    ((attendance as any[]).reduce((sum: number, att: any) => sum + (parseFloat(att.hoursWorked) || 0), 0) / (attendance as any[]).length).toFixed(1) : "0";

  const leaveRequests = (employees as any[]).filter((emp: any) => emp.status === 'inactive').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground mb-4 sm:mb-0">Reports & Analytics</h2>
        <Button 
          onClick={handleExportReport}
          className="flex items-center space-x-2"
          data-testid="button-export-report"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </Button>
      </div>

      {/* Report Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-16 h-16 mb-2 mx-auto" />
                <p className="text-sm">Attendance chart visualization</p>
                <p className="text-xs mt-1">Chart implementation would use Chart.js or Recharts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <PieChart className="w-16 h-16 mb-2 mx-auto" />
                <p className="text-sm">Department pie chart</p>
                <p className="text-xs mt-1">Chart implementation would use Chart.js or Recharts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-avg-attendance">
                {avgAttendance}%
              </div>
              <div className="text-sm text-muted-foreground">Avg. Attendance</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="text-ontime-rate">
                {onTimeRate}%
              </div>
              <div className="text-sm text-muted-foreground">On-time Rate</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600" data-testid="text-avg-hours">
                {avgHours}h
              </div>
              <div className="text-sm text-muted-foreground">Avg. Daily Hours</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600" data-testid="text-leave-requests">
                {leaveRequests}
              </div>
              <div className="text-sm text-muted-foreground">Pending Leaves</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
