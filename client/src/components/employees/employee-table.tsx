import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, Edit, Eye, Trash2, Calendar } from "lucide-react";
import EmployeeForm from "./employee-form";
import { useAuthState } from "@/lib/auth";
import { Employee } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EmployeeTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/employees", searchQuery, departmentFilter, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const queryString = params.toString();
      try {
        const token = localStorage.getItem("auth_token");
        console.log('Auth token:', token);
        console.log('Making API request to:', `/api/employees${queryString ? '?' + queryString : ''}`);
        const response = await apiRequest('GET', `/api/employees${queryString ? '?' + queryString : ''}`);
        const jsonData = await response.json();
        console.log('API Response:', jsonData);
        if (!Array.isArray(jsonData)) {
          console.error('Invalid response format. Expected array, got:', typeof jsonData);
          return [];
        }
        return jsonData;
      } catch (err) {
        console.error('API Error:', err);
        throw err;
      }
    },
  });

  const employees = Array.isArray(data) ? data : [];

  const { user } = useAuthState();

  const [editingLeaveFor, setEditingLeaveFor] = useState<any>(null);
  const [leaveForm, setLeaveForm] = useState({ casualLeave: '', sickLeave: '', earnedLeave: '' });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    // Optimistic update: remove the employee from the cached list immediately
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/employees"] });
      const previous = queryClient.getQueryData<Employee[]>(["/api/employees"]);
      queryClient.setQueryData<Employee[]>(["/api/employees"], (old = []) => old.filter(e => e.id !== id));
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      // rollback
      if (context?.previous) {
        queryClient.setQueryData(["/api/employees"], context.previous);
      }
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate(id);
    }
  };

  if (showAddForm || editingEmployee) {
    return (
      <EmployeeForm
        employee={editingEmployee}
        onClose={() => {
          setShowAddForm(false);
          setEditingEmployee(null);
        }}
        onSuccess={() => {
          setShowAddForm(false);
          setEditingEmployee(null);
          queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        }}
      />
    );
  }


  const openLeaveEditor = (employee: any) => {
    setEditingLeaveFor(employee);
    setLeaveForm({
      casualLeave: String((employee as any).casualLeave ?? (employee as any).accountCasual ?? 12),
      sickLeave: String((employee as any).sickLeave ?? (employee as any).accountSick ?? 12),
      earnedLeave: String((employee as any).earnedLeave ?? (employee as any).accountEarned ?? 15),
    });
  };

  const submitLeaveUpdate = async () => {
    if (!editingLeaveFor) return;
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await fetch(`/api/leave-balances/${editingLeaveFor.employeeId || editingLeaveFor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ casualLeave: Number(leaveForm.casualLeave || 0), sickLeave: Number(leaveForm.sickLeave || 0), earnedLeave: Number(leaveForm.earnedLeave || 0) })
      });
      if (!resp.ok) {
        let errMsg = 'Failed to update leave balances';
        try {
          const body = await resp.json();
          if (body && body.message) errMsg = body.message;
        } catch (_) { }
        throw new Error(errMsg);
      }
      toast({ title: 'Updated', description: 'Leave balances updated' });
      setEditingLeaveFor(null);
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: (e as any).message || 'Failed to update leave balances', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground mb-4 sm:mb-0">Employee Management</h2>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2"
          data-testid="button-add-employee"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-employees"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger data-testid="select-department-filter">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="HR">Human Resources</SelectItem>
                  <SelectItem value="IT">Information Technology</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger data-testid="select-role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>





      {/* Employee Table */}
      <Card className="overflow-hidden shadow-md border-none">
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Account Role</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee: Employee) => (
                  <TableRow key={employee.id} className="group hover:bg-muted/50 transition-colors" data-testid={`row-employee-${employee.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-medium text-sm mr-3">
                          {`${employee.firstName[0]}${employee.lastName[0]}`}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{`${employee.firstName} ${employee.lastName}`}</div>
                          <div className="text-xs text-muted-foreground">{employee.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell className="capitalize">{((employee as any).accountRole || 'employee')}</TableCell>
                    <TableCell>₹{parseFloat(employee.salary || '0').toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className={employee.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEmployee(employee)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`button-edit-${employee.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {(
                          user?.role === 'admin' ||
                          user?.role === 'hr' ||
                          (user?.role === 'manager' && (user as any)?.employee?.department === 'HR')
                        ) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openLeaveEditor(employee)}
                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              data-testid={`button-edit-leave-${employee.id}`}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          data-testid={`button-view-${employee.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(employee.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${employee.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!editingLeaveFor} onOpenChange={(open) => !open && setEditingLeaveFor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Leave Balances for {editingLeaveFor?.firstName} {editingLeaveFor?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="casual" className="text-right">
                Casual
              </Label>
              <Input
                id="casual"
                value={leaveForm.casualLeave}
                onChange={(e) => setLeaveForm(s => ({ ...s, casualLeave: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sick" className="text-right">
                Sick
              </Label>
              <Input
                id="sick"
                value={leaveForm.sickLeave}
                onChange={(e) => setLeaveForm(s => ({ ...s, sickLeave: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="earned" className="text-right">
                Earned
              </Label>
              <Input
                id="earned"
                value={leaveForm.earnedLeave}
                onChange={(e) => setLeaveForm(s => ({ ...s, earnedLeave: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLeaveFor(null)}>Cancel</Button>
            <Button onClick={submitLeaveUpdate}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
