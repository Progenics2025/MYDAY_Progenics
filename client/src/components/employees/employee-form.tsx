import { useForm } from "react-hook-form";
import { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useAuthState } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button as UiButton } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { insertEmployeeSchema, Employee } from "@shared/schema";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const formSchema = insertEmployeeSchema.extend({
  joinDate: z.string().min(1, "Join date is required"),
  accountRole: z.string().optional(),
  profilePhoto: z.any().optional(),
  customDepartment: z.string().optional(),
  customRole: z.string().optional(),
  // ensure skills can be provided as comma-separated string in the form but server accepts array or string
}).transform((data) => ({ ...data }));

type FormData = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const { toast } = useToast();
  const { user } = useAuthState();
  // helper: treat a user with role 'manager' and department 'HR' as an HR manager
  const isHrManager = Boolean(user && user.role === 'manager' && (user as any).employee && (user as any).employee.department === 'HR');
  const isEditing = !!employee;
  const queryClient = useQueryClient();

  // Modal state to show created credentials
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<null | { name?: string; empId?: string; role?: string; department?: string; password?: string }>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      if (!employee) {
        return {
          firstName: '',
          lastName: '',
          email: '',
          employeeId: '',
          department: '',
          role: '',
          customDepartment: '',
          customRole: '',
          salary: '',
          status: 'active',
          joinDate: '',
          phone: '',
          emergencyContact: '',
          dateOfBirth: '',
          gender: undefined,
          bloodGroup: undefined,
          skills: '',
          maritalStatus: undefined,
          profilePhoto: undefined,
          accountRole: undefined,
          address: '',
          panNumber: '',
          aadhaarNumber: '',
          uanNumber: '',
          esicNumber: '',
          bankAccount: '',
          ifscCode: '',
        } as Partial<FormData>;
      }

      // Determine if department/role are one of the predefined values; if not, treat them as custom and prefill custom fields
      const predefinedDepartments = ['HR','IT','Marketing','Finance','Operations','Admin','Sales','Lab','Bioinformatics','Counselling'];
      const predefinedRoles = ['Team Lead','Manager','Senior Developer','Developer','Designer','Data Analyst','Junior Data Analyst','Genetic Counsellor','Administrator'];

      const deptVal = (employee.department as string) || '';
      const roleVal = (employee.role as string) || '';

      const isDeptPredefined = predefinedDepartments.includes(deptVal);
      const isRolePredefined = predefinedRoles.includes(roleVal);

      return {
        firstName: employee.firstName ?? '',
        lastName: employee.lastName ?? '',
        email: employee.email ?? '',
        employeeId: employee.employeeId ?? '',
        department: isDeptPredefined ? deptVal : (deptVal ? 'Other' : ''),
        role: isRolePredefined ? roleVal : (roleVal ? 'Other' : ''),
        customDepartment: isDeptPredefined ? '' : deptVal || '',
        customRole: isRolePredefined ? '' : roleVal || '',
        accountRole: (employee as any)?.accountRole ?? undefined,
        salary: (employee.salary as any) ?? '',
        status: (employee.status as 'active' | 'inactive' | 'terminated') ?? 'active',
        joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : '',
        phone: (employee as any)?.phone ?? '',
        emergencyContact: (employee as any)?.emergencyContact ?? '',
        dateOfBirth: (employee as any)?.dateOfBirth ? new Date((employee as any).dateOfBirth).toISOString().split('T')[0] : '',
        bloodGroup: (employee as any)?.bloodGroup ?? undefined,
        gender:(employee as any)?.gender ?? undefined,
        skills: (employee as any)?.skills ? (employee as any).skills.join(', ') : '',
        maritalStatus: (employee as any)?.maritalStatus ?? undefined,
        profilePhoto: undefined,
        address: (employee as any)?.address ?? '',
        panNumber: (employee as any)?.panNumber ?? '',
        aadhaarNumber: (employee as any)?.aadhaarNumber ?? '',
        uanNumber: (employee as any)?.uanNumber ?? '',
        esicNumber: (employee as any)?.esicNumber ?? '',
        bankAccount: (employee as any)?.bankAccount ?? '',
        ifscCode: (employee as any)?.ifscCode ?? '',
      } as Partial<FormData>;
    })(),
  });

  const department = watch('department');
  const role = watch('role');
  const customDepartment = watch('customDepartment');
  const customRole = watch('customRole');
  const status = watch('status');
  const phone = watch('phone');
  const profilePhoto = watch('profilePhoto');

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Prepare payload; if profile photo present, use FormData
  if ((data as any).profilePhoto instanceof File) {
        const form = new FormData();
        // Append all required fields. For skills, if array, JSON-stringify; if comma string, pass as string.
        for (const [k, v] of Object.entries(data)) {
          if (k === 'skills') {
            if (Array.isArray(v)) form.append(k, JSON.stringify(v));
            else form.append(k, String(v || ''));
          } else if ((k === 'joinDate' || k === 'dateOfBirth') && v) {
            form.append(k, new Date(String(v)).toISOString());
          } else if (k === 'profilePhoto' && v && (v as any).type && String((v as any).type).startsWith('image/')) {
            form.append('profilePhoto', v as any);
          } else if (v !== undefined && v !== null) {
            form.append(k, String(v));
          }
        }

        if (isEditing) {
          return await apiRequest("PUT", `/api/employees/${employee.id}`, form as any);
        } else {
          return await apiRequest("POST", "/api/employees", form as any);
        }
      }

      const payload = {
        ...data,
        joinDate: data.joinDate ? new Date(data.joinDate).toISOString() : undefined,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : undefined,
        skills: data.skills ? (Array.isArray(data.skills) ? data.skills : String(data.skills).split(',').map(s => s.trim()).filter(Boolean)) : [],
      } as any;

      if (isEditing) {
        return await apiRequest("PUT", `/api/employees/${employee.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/employees", payload);
      }
    },
    // For create requests we want to parse the response body (which includes the newly generated password)
    onSuccess: async (res: Response) => {
      try {
        if (!isEditing) {
          const data = await res.json().catch(() => null);
          const empName = data ? `${data.employee?.firstName || data.firstName || ''} ${data.employee?.lastName || data.lastName || ''}`.trim() : '';
          const empId = data?.employee?.employeeId || data?.employeeId || data?.employee?.id || data?.employee?.employee_id || data?.id || '';
          const role = data?.employee?.role || data?.role || data?.accountRole || '';
          const department = data?.employee?.department || data?.department || '';
          const password = data?.initialPassword || data?.password || data?.generatedPassword || data?.currentPassword || data?.employee?.password || null;

          // Save created info and show modal so admin can copy password.
          // Do NOT call parent onSuccess here because parent will close/unmount the form and the modal.
          setCreatedInfo({ name: empName, empId, role, department, password });
          setShowCreatedModal(true);
          // Refresh employees list so table shows the new entry while modal remains open
          try { queryClient.invalidateQueries({ queryKey: ['/api/employees'] }); } catch (e) { /* ignore */ }
        } else {
          toast({ title: 'Success', description: `Employee updated successfully` });
          onSuccess();
        }
      } catch (err) {
        toast({ title: 'Success', description: `Employee ${isEditing ? 'updated' : 'created'} successfully` });
      }

      // parent onSuccess will be called when modal is closed (so user can copy password)
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
    // Normalize phone numbers to digits only
    const sanitize = (s: any) => (s ? String(s).replace(/\D/g, '') : s);
    const prepared = {
      ...data,
      phone: sanitize((data as any).phone),
      emergencyContact: sanitize((data as any).emergencyContact),
    } as any;

    // If user selected 'Other' for department/role, prefer the custom fields
    if (prepared.department === 'Other' && prepared.customDepartment) {
      prepared.department = prepared.customDepartment;
    }
    if (prepared.role === 'Other' && prepared.customRole) {
      prepared.role = prepared.customRole;
    }

    // Remove helper custom fields before sending
    delete prepared.customDepartment;
    delete prepared.customRole;
    mutation.mutate(prepared);
  };

  const onInvalid = (errs: any) => {
    console.warn('Employee form validation failed:', errs);
    const entries = Object.entries(errs || {});
    if (entries.length === 0) {
      toast({ title: 'Validation error', description: 'Please fix validation errors', variant: 'destructive' });
      return;
    }
    const messages = entries.map(([k, v]: any) => `${k}: ${v?.message || 'Invalid'}`);
    toast({ title: 'Validation errors', description: messages.join(' · '), variant: 'destructive' });
    // focus first invalid field
    try {
      const firstKey = entries[0][0];
      const el = document.getElementById(firstKey);
      if (el && typeof (el as any).focus === 'function') (el as any).focus();
      el && el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      // ignore
    }
  };

  // Local preview state for profile photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    // validate image mime type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' })
      return
    }
    setValue('profilePhoto' as any, file as any)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

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
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary fields: first set */}
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register("firstName")} data-testid="input-employee-firstname" />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register("lastName")} data-testid="input-employee-lastname" />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} data-testid="input-employee-email" disabled={isEditing} />
                {isEditing && <p className="text-sm text-muted-foreground">Email cannot be changed after creation.</p>}
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" {...register("employeeId")} data-testid="input-employee-id" />
                {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={(value) => setValue('department', value)}>
                  <SelectTrigger data-testid="select-employee-department"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="IT">Information Technology</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Finance">Finance & Accounts</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Admin">Administration</SelectItem>
                    <SelectItem value="Sales">Sales & Business Development</SelectItem>
                    <SelectItem value="Lab">Laboratory & Research</SelectItem>
                    <SelectItem value="Bioinformatics">Bioinformatics & Genome analysis</SelectItem>
                    <SelectItem value="Counselling">Genetic & Nutrition Counsellor</SelectItem>
                    <SelectItem value="Other">Other (custom)</SelectItem>
                  </SelectContent>
                </Select>
                {department === 'Other' && (
                  <div className="mt-2">
                    <Input id="customDepartment" placeholder="Enter custom department" {...register('customDepartment') as any} />
                  </div>
                )}
                {errors.department && <p className="text-sm text-destructive">{errors.department.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value) => setValue('role', value)}>
                  <SelectTrigger data-testid="select-employee-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Senior Developer">Senior Developer</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                    <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                    <SelectItem value="Junior Data Analyst">Junior Data Analyst</SelectItem>
                    <SelectItem value="Genetic Counsellor">Genetic Counsellor</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Other">Other (custom)</SelectItem>
                  </SelectContent>
                </Select>
                {role === 'Other' && (
                  <div className="mt-2">
                    <Input id="customRole" placeholder="Enter custom role" {...register('customRole') as any} />
                  </div>
                )}
                {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
              </div>

              {(user?.role === 'admin' || isHrManager) && (
                <div className="space-y-2">
                  <Label htmlFor="accountRole">Account Role (user)</Label>
                  <Select value={(watch as any)('accountRole') || ''} onValueChange={(v) => setValue('accountRole', v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="salary">Annual Salary</Label>
                <Input id="salary" type="number" step="0.01" {...register("salary")} data-testid="input-employee-salary" />
                {errors.salary && <p className="text-sm text-destructive">{errors.salary.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date</Label>
                <Input id="joinDate" type="date" {...register("joinDate")} data-testid="input-employee-join-date" />
                {errors.joinDate && <p className="text-sm text-destructive">{errors.joinDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setValue('status', value as 'active' | 'inactive' | 'terminated')}>
                  <SelectTrigger data-testid="select-employee-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
              </div>

              {/* Secondary fields: contact, address, dob, blood, marital, skills, photo */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register('phone')} placeholder="e.g. +91 9876543210" />
                {errors.phone && (<p className="text-sm text-destructive">{errors.phone.message}</p>)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input id="emergencyContact" {...register('emergencyContact')} placeholder="Emergency contact number" />
                {errors.emergencyContact && (<p className="text-sm text-destructive">{errors.emergencyContact.message}</p>)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} placeholder="Street, City, State" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={(watch as any)('gender') || ''} onValueChange={(v) => (setValue as any)('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                {errors.dateOfBirth && (<p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>)}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select value={watch('bloodGroup') || ''} onValueChange={(v) => setValue('bloodGroup', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input id="skills" {...register('skills')} placeholder="React,Node,SQL" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select value={watch('maritalStatus') || ''} onValueChange={(v) => setValue('maritalStatus', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Marital Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profilePhoto">Profile Photo</Label>
                <input type="file" accept="image/*" onChange={onPhotoChange} />
                {photoPreview && (
                  <div className="mt-2">
                    <img src={photoPreview} alt="preview" className="w-24 h-24 object-cover rounded-full" />
                  </div>
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

      {/* Created employee modal */}
      <Dialog open={showCreatedModal} onOpenChange={(open) => { if (!open) { setShowCreatedModal(false); setCreatedInfo(null); } }}>
        {showCreatedModal && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Employee created</DialogTitle>
              <DialogDescription>Save these credentials — the password is shown only once.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <div><strong>Name:</strong> {createdInfo?.name || '-'}</div>
              <div><strong>Employee ID:</strong> {createdInfo?.empId || '-'}</div>
              <div><strong>Role:</strong> {createdInfo?.role || '-'}</div>
              <div><strong>Department:</strong> {createdInfo?.department || '-'}</div>
              <div className="mt-3">
                <label className="text-sm font-medium">Password</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="px-2 py-1 bg-muted rounded">{createdInfo?.password || '—'}</code>
                  <UiButton size="sm" onClick={() => {
                    if (createdInfo?.password) {
                      navigator.clipboard.writeText(createdInfo.password);
                      toast({ title: 'Copied', description: 'Password copied to clipboard' });
                    }
                  }}>Copy</UiButton>
                </div>
              </div>
            </div>

            <DialogFooter>
              <UiButton onClick={() => { setShowCreatedModal(false); setCreatedInfo(null); try { onSuccess(); } catch (e) {} onClose(); }}>Close</UiButton>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
