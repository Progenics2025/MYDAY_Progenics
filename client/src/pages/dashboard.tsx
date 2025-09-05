import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileHeader from "@/components/layout/mobile-header";
import BottomNav from "@/components/layout/bottom-nav";
import EmployeeTable from "@/components/employees/employee-table";
import AttendancePage from "@/components/attendance/attendance-page";
import PayrollOverview from "@/components/payroll/payroll-overview";
import ExpenseForm from "@/components/expenses/expense-form";
import DocumentUpload from "@/components/documents/document-upload";
import ProfileForm from "@/components/profile/profile-form";
import ReportsDashboard from "@/components/reports/reports-dashboard";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, CalendarX, DollarSign, TrendingUp, BarChart3, Clock, MapPin, Receipt, Calendar, FileText, UserCircle } from "lucide-react";

type ActiveSection = "dashboard" | "employees" | "attendance" | "payroll" | "expenses" | "documents" | "profile" | "reports";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const renderContent = () => {
    switch (activeSection) {
      case "employees":
        return <EmployeeTable />;
      case "attendance":
        return <AttendancePage />;
      case "payroll":
        return <PayrollOverview />;
      case "expenses":
        return <ExpenseForm />;
      case "documents":
        return <DocumentUpload />;
      case "profile":
        return <ProfileForm />;
      case "reports":
        return <ReportsDashboard />;
      default:
        return <DashboardOverview stats={stats} setActiveSection={setActiveSection} />;
    }
  };

  const getSectionTitle = (section: ActiveSection) => {
    const titles = {
      dashboard: "Dashboard",
      employees: "Team Management",
      attendance: "Attendance",
      "gps-punch": "GPS Punch",
      payroll: "Payroll",
      expenses: "Expenses",
      leave: "Leave Requests",
      documents: "Documents",
      profile: "Profile",
      reports: "Reports"
    };
    return titles[section] || "Dashboard";
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
      <div className={`md:hidden fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
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
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {renderContent()}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
    </div>
  );
}

function DashboardOverview({ stats, setActiveSection }: { stats: any; setActiveSection: (section: ActiveSection) => void }) {
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-employees">
                  {stats?.totalEmployees || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">12%</span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-present-today">
                  {stats?.presentToday || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600">{stats?.attendanceRate || 0}%</span>
              <span className="text-muted-foreground ml-2">attendance rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-on-leave">
                  {stats?.onLeave || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CalendarX className="text-yellow-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">3 sick, 5 vacation</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payroll Due</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-payroll-due">
                  ₹{stats?.payrollDue?.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-purple-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">Due in 3 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="text-blue-600 text-sm" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">System initialized successfully</p>
                  <p className="text-xs text-muted-foreground">HR Management System • Just now</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-green-600 text-sm" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Admin user logged in</p>
                  <p className="text-xs text-muted-foreground">Authentication module • 1 minute ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          </div>
          <CardContent className="p-6 space-y-3">
            <button 
              className="w-full flex items-center space-x-3 p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
              onClick={() => setActiveSection("employees")}
              data-testid="button-add-employee"
            >
              <Users className="w-4 h-4" />
              <span>Manage Employees</span>
            </button>
            <button 
              className="w-full flex items-center space-x-3 p-3 bg-accent hover:bg-accent/80 text-accent-foreground rounded-md transition-colors"
              onClick={() => setActiveSection("payroll")}
              data-testid="button-generate-payroll"
            >
              <DollarSign className="w-4 h-4" />
              <span>Generate Payroll</span>
            </button>
            <button 
              className="w-full flex items-center space-x-3 p-3 bg-accent hover:bg-accent/80 text-accent-foreground rounded-md transition-colors"
              onClick={() => setActiveSection("reports")}
              data-testid="button-view-reports"
            >
              <TrendingUp className="w-4 h-4" />
              <span>View Reports</span>
            </button>
            <button 
              className="w-full flex items-center space-x-3 p-3 bg-accent hover:bg-accent/80 text-accent-foreground rounded-md transition-colors"
              onClick={() => setActiveSection("attendance")}
              data-testid="button-manage-attendance"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Attendance</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
