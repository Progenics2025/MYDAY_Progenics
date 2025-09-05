import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEmployeeSchema, Employee } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const formSchema = insertEmployeeSchema.extend({
  joinDate: z.string().min(1, "Join date is required"),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!employee;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: employee ? {
      ...employee,
      joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : '',
    } : {
      firstName: '',
      lastName: '',
      email: '',
      employeeId: '',
      department: '',
      role: '',
      salary: '',
      status: 'active',
      joinDate: '',
    },
  });

  const department = watch('department');
  const role = watch('role');
  const status = watch('status');

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
      };

      if (isEditing) {
        return await apiRequest("PUT", `/api/employees/${employee.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/employees", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Employee ${isEditing ? 'updated' : 'created'} successfully`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} employee`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="flex items-center space-x-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employees</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  data-testid="input-employee-firstname"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  data-testid="input-employee-lastname"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  data-testid="input-employee-email"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  {...register("employeeId")}
                  data-testid="input-employee-id"
                />
                {errors.employeeId && (
                  <p className="text-sm text-destructive">{errors.employeeId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={(value) => setValue('department', value)}>
                  <SelectTrigger data-testid="select-employee-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="IT">Information Technology</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Finance">Finance & Accounts</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Admin">Administration</SelectItem>
                    <SelectItem value="Sales">Sales & Business Development</SelectItem>
                    <SelectItem value="Legal">Legal & Compliance</SelectItem>
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-sm text-destructive">{errors.department.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value) => setValue('role', value)}>
                  <SelectTrigger data-testid="select-employee-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Senior Developer">Senior Developer</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                    <SelectItem value="Analyst">Analyst</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Annual Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  {...register("salary")}
                  data-testid="input-employee-salary"
                />
                {errors.salary && (
                  <p className="text-sm text-destructive">{errors.salary.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date</Label>
                <Input
                  id="joinDate"
                  type="date"
                  {...register("joinDate")}
                  data-testid="input-employee-join-date"
                />
                {errors.joinDate && (
                  <p className="text-sm text-destructive">{errors.joinDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setValue('status', value)}>
                  <SelectTrigger data-testid="select-employee-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* Indian Document Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Indian Documents & Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    {...register("panNumber")}
                    placeholder="ABCDE1234F"
                    data-testid="input-pan-number"
                  />
                  {errors.panNumber && (
                    <p className="text-sm text-destructive">{errors.panNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                  <Input
                    id="aadhaarNumber"
                    {...register("aadhaarNumber")}
                    placeholder="1234 5678 9012"
                    data-testid="input-aadhaar-number"
                  />
                  {errors.aadhaarNumber && (
                    <p className="text-sm text-destructive">{errors.aadhaarNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uanNumber">UAN Number (PF)</Label>
                  <Input
                    id="uanNumber"
                    {...register("uanNumber")}
                    placeholder="123456789012"
                    data-testid="input-uan-number"
                  />
                  {errors.uanNumber && (
                    <p className="text-sm text-destructive">{errors.uanNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="esicNumber">ESIC Number</Label>
                  <Input
                    id="esicNumber"
                    {...register("esicNumber")}
                    placeholder="1234567890123456"
                    data-testid="input-esic-number"
                  />
                  {errors.esicNumber && (
                    <p className="text-sm text-destructive">{errors.esicNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Bank Account Number</Label>
                  <Input
                    id="bankAccount"
                    {...register("bankAccount")}
                    placeholder="1234567890"
                    data-testid="input-bank-account"
                  />
                  {errors.bankAccount && (
                    <p className="text-sm text-destructive">{errors.bankAccount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    {...register("ifscCode")}
                    placeholder="SBIN0001234"
                    data-testid="input-ifsc-code"
                  />
                  {errors.ifscCode && (
                    <p className="text-sm text-destructive">{errors.ifscCode.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-save-employee"
              >
                {mutation.isPending ? 'Saving...' : (isEditing ? 'Update Employee' : 'Create Employee')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
