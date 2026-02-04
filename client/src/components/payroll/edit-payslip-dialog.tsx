import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    esi: (payroll as any).esi || '0',
    incomeTax: (payroll as any).incomeTax || '0',
    otherDeductions: (payroll as any).otherDeductions || '0',
    // Totals - initialized from payroll or calculated
    grossSalary: payroll.grossSalary,
    totalDeductions: payroll.totalDeductions,
    netSalary: payroll.netSalary,
    // Payroll Days
    totalDays: new Date(payroll.year, payroll.month, 0).getDate().toString(),
    daysPaid: payroll.daysPaid || '30.0',
    arrearDays: payroll.arrearDays || '0',
    absentDays: payroll.absentDays || '0',
    // LOP calculation will be automatic based on absent days
    lop: payroll.lop || '0',
    // Location fields - prefer values from payroll (persisted), fallback to employee
    city: (payroll as any).city || (employee as any).city || '',
    state: (payroll as any).state || (employee as any).state || '',
  });

  // Deduction Toggles State
  const [toggles, setToggles] = useState({
    professionalTax: parseFloat(payroll.professionalTax) > 0,
    providentFund: parseFloat(payroll.providentFund) > 0,
    esi: parseFloat((payroll as any).esi || '0') > 0,
    incomeTax: parseFloat((payroll as any).incomeTax || '0') > 0,
    otherDeductions: parseFloat((payroll as any).otherDeductions || '0') > 0,
  });

  // Calculated Absent Deduction Amount (separate from manual LOP)
  const [absentDeductionAmount, setAbsentDeductionAmount] = useState('0');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTotalsFromValues = (values: any, currentToggles?: any) => {
    // Use current toggles or fallback to state
    const activeToggles = currentToggles || toggles;

    // Calculate gross salary (Sum of all earnings)
    const basic = parseFloat(values.basicSalary) || 0;
    const grossSalary = (
      basic +
      (parseFloat(values.hra) || 0) +
      (parseFloat(values.transportAllowance) || 0) +
      (parseFloat(values.medicalAllowance) || 0) +
      (parseFloat(values.otherAllowances) || 0)
    ).toFixed(2);

    // Calculate Absent Deduction (Gross / Total Days * Absent Days)
    const totalDays = parseFloat(values.totalDays) || 30;
    const absent = parseFloat(values.absentDays) || 0;
    const perDaySalary = totalDays > 0 ? parseFloat(grossSalary) / totalDays : 0;
    const calculatedAbsentDeduction = (absent * perDaySalary);

    // Manual LOP
    const manualLop = parseFloat(values.lop) || 0;

    // Calculate Total Deductions based on TOGGLES
    let totalDeductionsVal = 0;
    if (activeToggles.professionalTax) totalDeductionsVal += (parseFloat(values.professionalTax) || 0);
    if (activeToggles.providentFund) totalDeductionsVal += (parseFloat(values.providentFund) || 0);
    if (activeToggles.esi) totalDeductionsVal += (parseFloat(values.esi) || 0);
    if (activeToggles.incomeTax) totalDeductionsVal += (parseFloat(values.incomeTax) || 0);
    if (activeToggles.otherDeductions) totalDeductionsVal += (parseFloat(values.otherDeductions) || 0);

    // Add Absent Deduction and Manual LOP
    totalDeductionsVal += calculatedAbsentDeduction;
    totalDeductionsVal += manualLop;

    const totalDeductions = totalDeductionsVal.toFixed(2);
    const netSalary = (parseFloat(grossSalary) - totalDeductionsVal).toFixed(2);

    return {
      grossSalary,
      totalDeductions,
      netSalary,
      absentDeduction: calculatedAbsentDeduction.toFixed(2)
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // List of fields that trigger re-calculation of totals
    const componentFields = [
      'basicSalary', 'hra', 'transportAllowance', 'medicalAllowance', 'otherAllowances',
      'professionalTax', 'providentFund', 'esi', 'incomeTax', 'otherDeductions',
      'absentDays', 'totalDays', 'lop'
    ];

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // If a component changed, auto-calculate the totals
      if (componentFields.includes(name)) {
        const { grossSalary, totalDeductions, netSalary, absentDeduction } = calculateTotalsFromValues(newData, toggles);

        // Update local state for absent deduction to display it
        setAbsentDeductionAmount(absentDeduction);

        return {
          ...newData,
          grossSalary,
          totalDeductions,
          netSalary,
          // Update daysPaid if absentDays changed
          daysPaid: name === 'absentDays' ? ((parseFloat(newData.totalDays) || 30) - (parseFloat(value) || 0)).toFixed(1) : prev.daysPaid
        };
      }

      return newData;
    });
  };

  const handleToggleChange = (name: string, checked: boolean) => {
    setToggles(prev => {
      const newToggles = { ...prev, [name]: checked };
      // Recalculate totals immediately with new toggles
      const { grossSalary, totalDeductions, netSalary, absentDeduction } = calculateTotalsFromValues(formData, newToggles);

      setAbsentDeductionAmount(absentDeduction);

      setFormData(prevData => ({
        ...prevData,
        grossSalary,
        totalDeductions,
        netSalary
      }));

      return newToggles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use the values from formData (which might have been manually edited)
      const { grossSalary, totalDeductions, netSalary } = formData;

      // Build payload for server update (include city/state so payroll stores location)
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
        // Use toggles to determine if we send the value or 0
        esi: toggles.esi ? parseFloat(formData.esi) : 0,
        incomeTax: toggles.incomeTax ? parseFloat(formData.incomeTax) : 0,
        otherDeductions: toggles.otherDeductions ? parseFloat(formData.otherDeductions) : 0,
        professionalTax: toggles.professionalTax ? parseFloat(formData.professionalTax) : 0,
        providentFund: toggles.providentFund ? parseFloat(formData.providentFund) : 0,
      };

      // Save the changes first (include city/state so payroll stores them)
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Payslip - {employee.firstName} {employee.lastName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable content area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-2 space-y-6">

            {/* Top Grid: Earnings and Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Earnings Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-green-700 bg-green-50 p-2 rounded flex items-center">
                  <span className="mr-2 text-lg">+</span> Earnings
                </h3>
                <div className="space-y-3 pl-2">
                  {[
                    { id: 'basicSalary', label: 'Basic Salary' },
                    { id: 'hra', label: 'HRA' },
                    { id: 'transportAllowance', label: 'Transport Allowance' },
                    { id: 'medicalAllowance', label: 'Medical Allowance' },
                    { id: 'otherAllowances', label: 'Other Allowances' },
                  ].map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id} className="text-xs text-muted-foreground">{field.label}</Label>
                      <Input
                        id={field.id}
                        name={field.id}
                        type="number"
                        step="0.01"
                        value={(formData as any)[field.id]}
                        onChange={handleInputChange}
                        className="h-8 md:h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-red-700 bg-red-50 p-2 rounded flex items-center">
                  <span className="mr-2 text-lg">-</span> Deductions
                </h3>
                <div className="space-y-3 pl-2">
                  {[
                    { id: 'professionalTax', label: 'Professional Tax' },
                    { id: 'providentFund', label: 'Provident Fund' },
                    { id: 'esi', label: 'ESI' },
                    { id: 'incomeTax', label: 'Income Tax' },
                    { id: 'otherDeductions', label: 'Other Deductions' },
                  ].map((field) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`toggle-${field.id}`}
                            checked={(toggles as any)[field.id]}
                            onCheckedChange={(checked) => handleToggleChange(field.id, checked as boolean)}
                          />
                          <Label htmlFor={`toggle-${field.id}`} className="cursor-pointer text-xs">
                            {field.label}
                          </Label>
                        </div>
                        <Input
                          id={field.id}
                          name={field.id}
                          type="number"
                          step="0.01"
                          value={(formData as any)[field.id]}
                          onChange={handleInputChange}
                          disabled={!(toggles as any)[field.id]}
                          className={`h-8 md:h-9 ${!(toggles as any)[field.id] ? "bg-muted text-muted-foreground" : ""}`}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <Label htmlFor="absentDeduction" className="text-xs text-muted-foreground">Absent Deduction (Calculated)</Label>
                    <Input
                      id="absentDeduction"
                      value={absentDeductionAmount}
                      readOnly
                      className="bg-muted h-8 md:h-9"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Based on Absent Days & Gross Salary</p>
                  </div>

                  <div>
                    <Label htmlFor="lop" className="text-xs text-muted-foreground">Loss of Pay (Manual)</Label>
                    <Input
                      id="lop"
                      name="lop"
                      type="number"
                      step="0.01"
                      value={formData.lop}
                      onChange={handleInputChange}
                      placeholder="Enter amount"
                      className="h-8 md:h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-semibold text-gray-700">Payslip Location</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                  <Input id="city" name="city" type="text" value={formData.city} onChange={handleInputChange} className="h-8 md:h-9" />
                </div>
                <div>
                  <Label htmlFor="state" className="text-xs text-muted-foreground">State</Label>
                  <Input id="state" name="state" type="text" value={formData.state} onChange={handleInputChange} className="h-8 md:h-9" />
                </div>
              </div>
            </div>

            {/* Payroll Days Section */}
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-semibold text-gray-700">Payroll Days</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="totalDays" className="text-xs text-muted-foreground">Total Days</Label>
                  <Input id="totalDays" name="totalDays" type="number" step="0.5" value={formData.totalDays} onChange={handleInputChange} className="h-8 md:h-9" />
                </div>
                <div>
                  <Label htmlFor="daysPaid" className="text-xs text-muted-foreground">Days Paid</Label>
                  <Input id="daysPaid" name="daysPaid" type="number" step="0.5" value={formData.daysPaid} onChange={handleInputChange} className="h-8 md:h-9" />
                </div>
                <div>
                  <Label htmlFor="arrearDays" className="text-xs text-muted-foreground">Arrear Days</Label>
                  <Input id="arrearDays" name="arrearDays" type="number" step="0.5" value={formData.arrearDays} onChange={handleInputChange} className="h-8 md:h-9" />
                </div>
                <div>
                  <Label htmlFor="absentDays" className="text-xs text-muted-foreground">Absent Days</Label>
                  <Input id="absentDays" name="absentDays" type="number" step="0.5" value={formData.absentDays} onChange={handleInputChange} className="h-8 md:h-9" />
                </div>
              </div>
            </div>

            {/* Totals Section */}
            <div className="space-y-2 pt-2 border-t">
              <h3 className="text-sm font-semibold text-gray-700">Totals Calculation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="grossSalary" className="text-xs text-green-600 font-bold">Gross Salary</Label>
                  <Input
                    id="grossSalary"
                    name="grossSalary"
                    type="number"
                    step="0.01"
                    value={formData.grossSalary}
                    onChange={handleInputChange}
                    className="font-medium bg-green-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="totalDeductions" className="text-xs text-red-600 font-bold">Total Deductions</Label>
                  <Input
                    id="totalDeductions"
                    name="totalDeductions"
                    type="number"
                    step="0.01"
                    value={formData.totalDeductions}
                    onChange={handleInputChange}
                    className="font-medium bg-red-50/50"
                  />
                </div>
                <div>
                  <Label htmlFor="netSalary" className="text-xs text-blue-600 font-bold">Net Salary</Label>
                  <Input
                    id="netSalary"
                    name="netSalary"
                    type="number"
                    step="0.01"
                    value={formData.netSalary}
                    onChange={handleInputChange}
                    className="font-bold border-blue-200 bg-blue-50/50"
                  />
                </div>
              </div>
            </div>

          </div>

          <DialogFooter className="mt-4 border-t pt-4">
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
                    const { grossSalary, totalDeductions, netSalary } = formData;
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
                      // Use toggles to determine if we send the value or 0
                      esi: toggles.esi ? parseFloat(formData.esi) : 0,
                      incomeTax: toggles.incomeTax ? parseFloat(formData.incomeTax) : 0,
                      otherDeductions: toggles.otherDeductions ? parseFloat(formData.otherDeductions) : 0,
                      professionalTax: toggles.professionalTax ? parseFloat(formData.professionalTax) : 0,
                      providentFund: toggles.providentFund ? parseFloat(formData.providentFund) : 0,
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
                      esi: toggles.esi ? parseFloat(formData.esi) : 0,
                      incomeTax: toggles.incomeTax ? parseFloat(formData.incomeTax) : 0,
                      otherDeductions: toggles.otherDeductions ? parseFloat(formData.otherDeductions) : 0,
                      professionalTax: toggles.professionalTax ? parseFloat(formData.professionalTax) : 0,
                      providentFund: toggles.providentFund ? parseFloat(formData.providentFund) : 0,
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