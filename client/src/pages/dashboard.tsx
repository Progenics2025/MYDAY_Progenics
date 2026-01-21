import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileHeader from "@/components/layout/mobile-header";
import BottomNav from "@/components/layout/bottom-nav";
import EmployeeTable from "@/components/employees/employee-table";
import AttendancePage from "@/components/attendance/attendance-page";
import PayrollOverview from "@/components/payroll/payroll-overview";
import ExpenseForm from "@/components/expenses/expense-form";
import ExpenseList from "@/components/expenses/expense-list";
import LeaveRequestsList from "@/components/leave/leave-requests-list";
import DocumentUpload from "@/components/documents/document-upload";
import ProfileForm from "@/components/profile/profile-form";
import ReportsDashboard from "@/components/reports/reports-dashboard";
import HolidayCalendar from "@/components/holiday/holiday-calendar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, CalendarX, DollarSign, TrendingUp, BarChart3, Clock, MapPin, Receipt, Calendar, FileText, UserCircle, Navigation } from "lucide-react";
import { useAuthState } from "@/lib/auth";
import FieldTrackingDashboard from "@/components/field-tracking/FieldTrackingDashboard";

type ActiveSection = "dashboard" | "employees" | "attendance" | "payroll" | "expenses" | "documents" | "profile" | "reports" | "leave" | "holiday" | "field-tracking";

export default function Dashboard() {
  const { user } = useAuthState();
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Define allowed sections based on user role
  const getAllowedSections = () => {
    const allSections = {
      dashboard: ["admin", "manager", "employee"],
      employees: ["admin", "manager"],
      attendance: ["admin", "manager", "employee"],
      payroll: ["admin", "manager", "hr"],
      expenses: ["admin", "manager", "employee"],
      leave: ["admin", "manager", "employee"],
      documents: ["admin", "manager", "employee"],
      profile: ["manager", "employee"],
      reports: ["admin", "manager"],
      holiday: ["admin", "manager", "employee"],
      "field-tracking": ["admin", "manager"]
    };

    return Object.keys(allSections).filter(section =>
    // Allow HR managers (role 'manager' with department 'HR') to access sections normally reserved for 'hr'
    (allSections[section as keyof typeof allSections].includes(user?.role || "employee") ||
      (user?.role === 'manager' && (user as any)?.employee?.department === 'HR' && allSections[section as keyof typeof allSections].includes('hr'))
    )
    ) as ActiveSection[];
  };

  const allowedSections = getAllowedSections();

  // Redirect to dashboard if trying to access unauthorized section
  useEffect(() => {
    if (!allowedSections.includes(activeSection)) {
      setActiveSection("dashboard");
    }
  }, [activeSection, allowedSections]);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const renderContent = () => {
    // Check if user has access to the current section
    if (!allowedSections.includes(activeSection)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this section.</p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case "employees":
        return <EmployeeTable />;
      case "attendance":
        return <AttendancePage />;
      case "payroll":
        return <PayrollOverview />;
      case "expenses":
        // show form and list side-by-side; ExpenseList will call the admin endpoint when appropriate
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ExpenseForm />
            </div>
            <div>
              <ExpenseList />
            </div>
          </div>
        );
      case "documents":
        return <DocumentUpload />;
      case "leave":
        return (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div>
              <LeaveRequestsList />
            </div>
          </div>
        );
      case "profile":
        return <ProfileForm />;
      case "reports":
        return <ReportsDashboard />;
      case "holiday":
        return <HolidayCalendar role={(user?.role || 'employee') as any} />;
      case "field-tracking":
        return <FieldTrackingDashboard />;
      default:
        return <DashboardOverview stats={stats} setActiveSection={setActiveSection} user={user} />;
    }
  };

  const getSectionTitle = (section: ActiveSection) => {
    const titles = {
      dashboard: "Dashboard",
      employees: "Team Management",
      attendance: "Attendance", "gps-punch": "GPS Punch",
      payroll: "Payroll",
      expenses: "Expenses",
      leave: "Leave Requests",
      documents: "Documents",
      profile: "Profile",
      reports: "Reports",
      holiday: "Company Holidays",
      "field-tracking": "Field Tracking"
    };
    return titles[section] || "Dashboard";
  };

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden pointer-events-auto"
          onClick={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSidebarOpen(false);
          }}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header
            title={getSectionTitle(activeSection)}
            onMenuToggle={() => setSidebarOpen(true)}
          />
        </div>

        {/* Mobile Header */}
        <MobileHeader
          title={getSectionTitle(activeSection)}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-20 sm:pb-24 md:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeSection={activeSection}
        onSectionChange={(section) => setActiveSection(section as ActiveSection)}
      />
    </div>
  );
}

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import CalendarView from "@/components/holiday/calendar-view";

function DashboardOverview({ stats, setActiveSection, user }: { stats: any; setActiveSection: (section: ActiveSection) => void; user: any }) {
  const employeeId = user?.employee?.employeeId;
  const { data: balances = { casualLeave: 12, sickLeave: 12, earnedLeave: 15 } } = useQuery({
    queryKey: ['/api/leave-balances', employeeId],
    queryFn: async () => {
      if (!employeeId) return { casualLeave: 12, sickLeave: 12, earnedLeave: 15 };
      try {
        const res = await apiRequest('GET', `/api/leave-balances/${employeeId}`);
        return await res.json();
      } catch (e) {
        return { casualLeave: 12, sickLeave: 12, earnedLeave: 15 };
      }
    },
    enabled: !!employeeId,
  });

  // Calculate used leaves (Total - Remaining)
  const totalCasual = 12;
  const totalSick = 12;
  const totalEarned = 15;

  const usedCasual = totalCasual - (Number(balances?.casualLeave) || 0);
  const usedSick = totalSick - (Number(balances?.sickLeave) || 0);
  const usedEarned = totalEarned - (Number(balances?.earnedLeave) || 0);

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Mock data for Recent Activity
  const recentActivity = [
    { id: 1, title: "Leave Approved", desc: "Your casual leave for Nov 28 was approved", time: "2 hours ago", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { id: 2, title: "New Policy", desc: "Updated expense policy available", time: "Yesterday", icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { id: 3, title: "Holiday Reminder", desc: "Diwali holiday on Nov 12", time: "2 days ago", icon: Calendar, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Stats Row - Role Based Visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {/* Total Employees (Admin/HR) */}
        {isAdminOrHR && (
          <Card className="border-none shadow-xl bg-white dark:bg-slate-800 hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-3 sm:p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Total Employees</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats?.totalEmployees || 124}</h3>
              </div>
              <div className="p-2 sm:p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Present Today (Admin/Manager) */}
        {isAdminOrManager && (
          <Card className="border-none shadow-xl bg-white dark:bg-slate-800 hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-3 sm:p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Present Today</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats?.presentToday || 0}</h3>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* On Leave (Admin/Manager) */}
        {isAdminOrManager && (
          <Card className="border-none shadow-xl bg-white dark:bg-slate-800 hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-3 sm:p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">On Leave</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats?.onLeave || 0}</h3>
              </div>
              <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <CalendarX className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payroll Due (Admin/HR) */}
        {isAdminOrHR && (
          <Card className="border-none shadow-xl bg-white dark:bg-slate-800 hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-3 sm:p-4 md:p-6 flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Payroll Due</p>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-2">₹{stats?.payrollDue?.toLocaleString() || '12.5L'}</h3>
              </div>
              <div className="p-2 sm:p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-8">

        {/* Left Column: Leave Balances & Calendar */}
        <div className="md:col-span-2 lg:col-span-2 space-y-4 md:space-y-8">

          {/* My Leave Balances */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-800">
            <div className="p-3 sm:p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">My Leave Balances</h3>
              <span className="text-xs sm:text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                Total Remaining: {(Number(balances?.casualLeave) || 0) + (Number(balances?.sickLeave) || 0) + (Number(balances?.earnedLeave) || 0)} Days
              </span>
            </div>
            <CardContent className="p-3 sm:p-4 md:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-3 sm:p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Casual Leave</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{Number(balances?.casualLeave) || 0}/{totalCasual}</p>
                <p className="text-xs text-slate-400 mt-1">Available</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Sick Leave</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{Number(balances?.sickLeave) || 0}/{totalSick}</p>
                <p className="text-xs text-slate-400 mt-1">Available</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 p-3 sm:p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Earned Leave</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{Number(balances?.earnedLeave) || 0}/{totalEarned}</p>
                <p className="text-xs text-slate-400 mt-1">Available</p>
              </div>
            </CardContent>
          </Card>

          {/* Field Tracking Section - Admin/Manager Only */}
          {isAdminOrManager && (
            <Card className="border-none shadow-xl bg-white dark:bg-slate-800">
              <div className="p-3 sm:p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-indigo-500" />
                  Field Tracking
                </h3>
                <button
                  onClick={() => setActiveSection('field-tracking')}
                  className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full transition-colors"
                >
                  View Full Dashboard →
                </button>
              </div>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <FieldTrackingSummary />
              </CardContent>
            </Card>
          )}

          {/* Calendar View (Replaces Upcoming Holidays) */}
          <CalendarView />

        </div>

        {/* Right Column: Quick Actions & Recent Activity */}
        <div className="space-y-4 md:space-y-8">

          {/* Quick Actions */}
          <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
            <div className="p-3 sm:p-4 md:p-6 border-b border-white/10">
              <h3 className="text-base sm:text-lg font-semibold flex items-center text-white">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-emerald-400" />
                Quick Actions
              </h3>
            </div>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                {/* Admin Only Actions */}
                {user?.role === 'admin' && (
                  <button className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/5 hover:border-white/20 group" onClick={() => setActiveSection('employees')}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-indigo-200">Add Staff</span>
                  </button>
                )}

                {/* Common Actions */}
                <button className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/5 hover:border-white/20 group" onClick={() => setActiveSection('attendance')}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-blue-200">Attendance</span>
                </button>

                <button className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/5 hover:border-white/20 group" onClick={() => setActiveSection('leave')}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-200">Apply Leave</span>
                </button>

                <button className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/5 hover:border-white/20 group" onClick={() => setActiveSection('expenses')}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-200">Expense</span>
                </button>

                <button className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/5 hover:border-white/20 group" onClick={() => setActiveSection('profile')}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-violet-500/20 flex items-center justify-center mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                    <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-violet-200">Profile</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-800">
            <div className="p-3 sm:p-4 md:p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">Recent Activity</h3>
            </div>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex space-x-3 sm:space-x-4">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${activity.bg}`}>
                      <activity.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${activity.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{activity.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 break-words">{activity.desc}</p>
                      <span className="text-[10px] font-medium text-slate-400 mt-2 block">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Field Tracking Summary Component for Dashboard
function FieldTrackingSummary() {
  const token = localStorage.getItem('auth_token');
  const today = new Date().toISOString().split('T')[0];

  const { data: trackingData, isLoading } = useQuery({
    queryKey: ['field-tracking-summary', today],
    queryFn: async () => {
      const res = await fetch(
        `/api/location/all-employees?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { employees: [] };
      return res.json();
    }
  });

  const employees = trackingData?.employees || [];
  const totalEmployeesTracked = employees.length;
  const totalDistance = employees.reduce((sum: number, e: any) => sum + (e.totalDistanceKm || 0), 0);
  const totalVisits = employees.reduce((sum: number, e: any) => sum + (e.visitCount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
          <p className="text-xl font-bold text-slate-900 dark:text-white">{totalEmployeesTracked}</p>
          <p className="text-xs text-slate-500">Field Staff</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-center">
          <Navigation className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-xl font-bold text-slate-900 dark:text-white">{totalDistance.toFixed(1)}</p>
          <p className="text-xs text-slate-500">Total Km</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 text-amber-500" />
          <p className="text-xl font-bold text-slate-900 dark:text-white">{totalVisits}</p>
          <p className="text-xs text-slate-500">Visits</p>
        </div>
      </div>

      {/* Active Field Staff List */}
      {employees.length > 0 ? (
        <div className="max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-slate-500 mb-2">Active Field Staff Today</p>
          <div className="space-y-2">
            {employees.slice(0, 5).map((emp: any) => (
              <div key={emp.employeeId} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo-600">{(emp.employeeName || 'U')[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{emp.employeeName || emp.employeeId}</p>
                    <p className="text-xs text-slate-500">{emp.department || 'Field'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{emp.totalDistanceKm?.toFixed(1) || 0} km</p>
                  <p className="text-xs text-slate-400">{emp.visitCount || 0} visits</p>
                </div>
              </div>
            ))}
          </div>
          {employees.length > 5 && (
            <p className="text-xs text-center text-slate-400 mt-2">+{employees.length - 5} more</p>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No field activity recorded today</p>
        </div>
      )}
    </div>
  );
}

// LeaveBalanceCard removed: dashboard now renders profile-style leave cards directly

