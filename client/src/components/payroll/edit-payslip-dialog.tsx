import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generatePayslipPDF } from "@/lib/pdf";
import { Employee, Payroll } from "@shared/schema";

interface EditPayslipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: Payroll;
  employee: Employee;
  onUpdate: () => void;
}

export function EditPayslipDialog({ isOpen, onClose, payroll, employee, onUpdate }: EditPayslipDialogProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [formData, setFormData] = useState({
    // Salary Components
    basicSalary: payroll.basicSalary,
    hra: payroll.hra,
    transportAllowance: payroll.transportAllowance,
    medicalAllowance: payroll.medicalAllowance,
    otherAllowances: payroll.otherAllowances,
    professionalTax: payroll.professionalTax,
    providentFund: payroll.providentFund,
    // Payroll Days
    totalDays: '30.0',
    daysPaid: '30.0',
    arrearDays: '0',
    absentDays: '0',
    // LOP calculation will be automatic based on absent days
    lop: '0',
    // Location fields - prefer values from payroll (persisted), fallback to employee
  city: (payroll as any).city || (employee as any).city || '',
  state: (payroll as any).state || (employee as any).state || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotals = () => {
    // Calculate per day salary for absent days deduction
    const perDaySalary = parseFloat(formData.basicSalary) / 30; // Assuming 30 days month
    const lopAmount = parseFloat(formData.absentDays) * perDaySalary;

    // Calculate gross salary after LOP
    const grossSalary = (
      parseFloat(formData.basicSalary) - lopAmount +
      parseFloat(formData.hra) +
      parseFloat(formData.transportAllowance) +
      parseFloat(formData.medicalAllowance) +
      parseFloat(formData.otherAllowances)
    ).toFixed(2);

    const totalDeductions = (
      parseFloat(formData.professionalTax) +
      parseFloat(formData.providentFund)
    ).toFixed(2);

    const netSalary = (parseFloat(grossSalary) - parseFloat(totalDeductions)).toFixed(2);

    return { grossSalary, totalDeductions, netSalary };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { grossSalary, totalDeductions, netSalary } = calculateTotals();
      
      // Build payload for server update (include city/state so payroll stores location)
      const payloadForServer: any = {
        ...formData,
        grossSalary,
        totalDeductions,
        netSalary,
      };

      await apiRequest("PUT", `/api/payroll/${payroll.id}`, payloadForServer);
      
      toast({
        title: "Success",
        description: "Payslip updated successfully",
      });
      
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Save payslip error:', error, error?.body);
      toast({
        title: "Error",
        description: (error?.body && (typeof error.body === 'string' ? error.body : JSON.stringify(error.body))) || error.message || "Failed to update payslip",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // When the dialog opens, reset scroll to top so users see the header/first fields
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Payslip - {employee.firstName} {employee.lastName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Scrollable content area - keeps footer/buttons visible while content scrolls */}
          <div ref={scrollRef} className="max-h-[calc(90vh-6.5rem)] overflow-y-auto pr-2 pb-24 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                  <span className="text-green-600">+</span>
                </span>
                Earnings
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="basicSalary">Basic Salary</Label>
                  <Input
                    id="basicSalary"
                    name="basicSalary"
                    type="number"
                    step="0.01"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="hra">HRA</Label>
                  <Input
                    id="hra"
                    name="hra"
                    type="number"
                    step="0.01"
                    value={formData.hra}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="transportAllowance">Transport Allowance</Label>
                  <Input
                    id="transportAllowance"
                    name="transportAllowance"
                    type="number"
                    step="0.01"
                    value={formData.transportAllowance}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="medicalAllowance">Medical Allowance</Label>
                  <Input
                    id="medicalAllowance"
                    name="medicalAllowance"
                    type="number"
                    step="0.01"
                    value={formData.medicalAllowance}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="otherAllowances">Other Allowances</Label>
                  <Input
                    id="otherAllowances"
                    name="otherAllowances"
                    type="number"
                    step="0.01"
                    value={formData.otherAllowances}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-2">
                  <span className="text-red-600">-</span>
                </span>
                Deductions
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="professionalTax">Professional Tax</Label>
                  <Input
                    id="professionalTax"
                    name="professionalTax"
                    type="number"
                    step="0.01"
                    value={formData.professionalTax}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="providentFund">Provident Fund</Label>
                  <Input
                    id="providentFund"
                    name="providentFund"
                    type="number"
                    step="0.01"
                    value={formData.providentFund}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payroll Days Section */}
          <div className="space-y-4 border rounded-lg p-4 bg-background">
            <h3 className="text-lg font-semibold">Payroll Days</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="totalDays">Total Days</Label>
                <Input
                  id="totalDays"
                  name="totalDays"
                  type="number"
                  step="0.5"
                  value={formData.totalDays}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="daysPaid">Days Paid</Label>
                <Input
                  id="daysPaid"
                  name="daysPaid"
                  type="number"
                  step="0.5"
                  value={formData.daysPaid}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="arrearDays">Arrear Days</Label>
                <Input
                  id="arrearDays"
                  name="arrearDays"
                  type="number"
                  step="0.5"
                  value={formData.arrearDays}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="absentDays">Absent Days</Label>
                <Input
                  id="absentDays"
                  name="absentDays"
                  type="number"
                  step="0.5"
                  value={formData.absentDays}
                  onChange={(e) => {
                    const absentDays = parseFloat(e.target.value) || 0;
                    const perDayAmount = parseFloat(formData.basicSalary) / 30; // Assuming 30 days month
                    const lop = (absentDays * perDayAmount).toFixed(2);
                    
                    setFormData(prev => ({
                      ...prev,
                      absentDays: e.target.value,
                      lop: lop,
                      daysPaid: (30 - absentDays).toFixed(1)
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* City / State - used for PDF rendering */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Payslip Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gross Salary:</span>
                <p className="font-medium">₹{calculateTotals().grossSalary}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Deductions:</span>
                <p className="font-medium">₹{calculateTotals().totalDeductions}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Net Salary:</span>
                <p className="font-medium">₹{calculateTotals().netSalary}</p>
              </div>
            </div>
          </div>

          </div>

          {/* Footer remains visible while the above content scrolls */}
          <DialogFooter className="sticky bottom-0 z-10 bg-background/90 backdrop-blur-sm border-t border-border flex space-x-2 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="outline"
              >
                {isSubmitting ? "Saving..." : "Save Only"}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  try {
                    const { grossSalary, totalDeductions, netSalary } = calculateTotals();
                        // Build payroll object for server (exclude city/state)
                        const payloadForServer: any = {
                          ...payroll,
                          ...formData,
                          grossSalary,
                          totalDeductions,
                          netSalary,
                          totalDays: parseFloat(formData.totalDays),
                          daysPaid: parseFloat(formData.daysPaid),
                          arrearDays: parseFloat(formData.arrearDays),
                          absentDays: parseFloat(formData.absentDays),
                          lop: parseFloat(formData.lop),
                        };

                        // Save the changes first (include city/state so payroll stores them)
                        await apiRequest("PUT", `/api/payroll/${payroll.id}`, payloadForServer);

                        // Build payroll object for PDF rendering (include city/state) — don't rely on DB
                        const payrollForPdf: any = {
                          ...payroll,
                          ...formData,
                          grossSalary,
                          totalDeductions,
                          netSalary,
                          totalDays: parseFloat(formData.totalDays),
                          daysPaid: parseFloat(formData.daysPaid),
                          arrearDays: parseFloat(formData.arrearDays),
                          absentDays: parseFloat(formData.absentDays),
                          lop: parseFloat(formData.lop),
                        };

                        const employeeForPdf = {
                          ...employee,
                          city: formData.city || (employee as any).city,
                          state: formData.state || (employee as any).state,
                        } as any;

                        // Generate PDF with updated values and merged employee location
                        generatePayslipPDF(payrollForPdf, employeeForPdf);
                    
                    toast({
                      title: "Success",
                      description: "Payslip updated and downloaded successfully",
                    });
                    
                    onUpdate();
                    onClose();
                  } catch (error: any) {
                    console.error('Save & Download error:', error, error?.body);
                    toast({
                      title: "Error",
                      description: (error?.body && (typeof error.body === 'string' ? error.body : JSON.stringify(error.body))) || error.message || "Failed to update and download payslip",
                      variant: "destructive",
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Processing..." : "Save & Download"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}