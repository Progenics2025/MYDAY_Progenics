import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generatePayslipPDF } from "@/lib/pdf";
import { DollarSign, Users, TrendingUp, Calculator, Eye, Download } from "lucide-react";
import { Payroll, Employee } from "@shared/schema";

export default function PayrollOverview() {
  const [departmentFilter, setDepartmentFilter] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: payrollRecords = [] } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll"],
  });

  const generatePayrollMutation = useMutation({
    mutationFn: async () => {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const employeeIds = (employees as Employee[]).map((emp: Employee) => emp.id);
      
      const response = await apiRequest("POST", "/api/payroll/generate", {
        period: currentMonth,
        employeeIds,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({
        title: "Success",
        description: "Payroll generated successfully for all employees",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payroll",
        variant: "destructive",
      });
    },
  });

  const handleGeneratePayroll = () => {
    if (confirm("Are you sure you want to generate payroll for all employees this month?")) {
      generatePayrollMutation.mutate();
    }
  };

  const handleDownloadPayslip = (payroll: Payroll) => {
    const employee = (employees as Employee[]).find((emp: Employee) => emp.id === payroll.employeeId);
    if (employee) {
      generatePayslipPDF(payroll, employee);
    }
  };

  const filteredPayroll = departmentFilter 
    ? payrollRecords.filter((payroll: Payroll) => {
        const employee = (employees as Employee[]).find((emp: Employee) => emp.id === payroll.employeeId);
        return employee?.department === departmentFilter;
      })
    : payrollRecords;

  // Calculate stats
  const totalPayroll = (payrollRecords as Payroll[]).reduce((sum: number, pay: Payroll) => sum + parseFloat(pay.netSalary), 0);
  const employeesPaid = new Set((payrollRecords as Payroll[]).map((pay: Payroll) => pay.employeeId)).size;
  const avgSalary = employeesPaid > 0 ? totalPayroll / employeesPaid : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground mb-4 sm:mb-0">Payroll Management</h2>
        <Button
          onClick={handleGeneratePayroll}
          disabled={generatePayrollMutation.isPending}
          className="flex items-center space-x-2"
          data-testid="button-generate-payroll"
        >
          <Calculator className="w-4 h-4" />
          <span>{generatePayrollMutation.isPending ? 'Generating...' : 'Generate Payroll'}</span>
        </Button>
      </div>

      {/* Payroll Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-payroll">
                  ₹{totalPayroll.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">For {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Employees Paid</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-employees-paid">
                  {employeesPaid}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600">100%</span>
              <span className="text-muted-foreground ml-2">completion</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Salary</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-salary">
                  ₹{avgSalary.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-purple-600 text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600">3.2%</span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll History */}
      <Card>
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground mb-4 sm:mb-0">Recent Payslips</h3>
            <div className="flex space-x-3">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48" data-testid="select-department-filter">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="HR">HR Department</SelectItem>
                  <SelectItem value="IT">IT Department</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
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
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gross Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                    No payroll records found
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((payroll: Payroll) => {
                  const employee = (employees as Employee[]).find((emp: Employee) => emp.id === payroll.employeeId);
                  
                  return (
                    <tr key={payroll.id} data-testid={`row-payroll-${payroll.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-medium text-sm">
                              {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : 'U'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-foreground">
                              {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {payroll.month}/{payroll.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        ₹{parseFloat(payroll.grossSalary).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        ₹{parseFloat(payroll.totalDeductions).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                        ₹{parseFloat(payroll.netSalary).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                            data-testid={`button-view-payslip-${payroll.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPayslip(payroll)}
                            className="text-green-600 hover:text-green-900"
                            data-testid={`button-download-payslip-${payroll.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
