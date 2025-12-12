import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Receipt, Upload } from 'lucide-react';

export default function ExpenseForm() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: '',
    category: '',
    amount: '',
    description: '',
    receipt: null as File | null,
  });

  const [formErrors, setFormErrors] = useState({
    date: '',
    category: '',
    amount: '',
    description: '',
    receipt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    const errors = {
      date: '',
      category: '',
      amount: '',
      description: '',
      receipt: '',
    };
    let isValid = true;

    if (!formData.date) {
      errors.date = 'Date is required';
      isValid = false;
    }

    if (!formData.category) {
      errors.category = 'Category is required';
      isValid = false;
    }

    if (!formData.amount) {
      errors.amount = 'Amount is required';
      isValid = false;
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
      isValid = false;
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
      isValid = false;
    }

    if (!formData.receipt) {
      errors.receipt = 'Receipt is required';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit expense');
      }
      
      // Reset form
      setFormData({
        date: '',
        category: '',
        amount: '',
        description: '',
        receipt: null,
      });

      // Invalidate expenses queries so lists refresh for employee and admin
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/expenses'] as any });
        queryClient.invalidateQueries({ queryKey: ['/api/expenses/all'] as any });
      } catch (e) {
        // ignore
      }

      // Show success message
      alert('Expense submitted successfully');
    } catch (error: any) {
      setError(error.message);
      console.error('Error submitting expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  if (formErrors.date) setFormErrors({ ...formErrors, date: '' });
                }}
                className={formErrors.date ? 'border-red-500' : ''}
              />
              {formErrors.date && (
                <span className="text-sm text-red-500">{formErrors.date}</span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value });
                  if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                }}
              >
                <SelectTrigger className={formErrors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
              {formErrors.category && (
                <span className="text-sm text-red-500">{formErrors.category}</span>
              )}
                <SelectContent>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="meals">Meals</SelectItem>
                  <SelectItem value="supplies">Office Supplies</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (₹)</label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Receipt</label>
            <div className="flex items-center space-x-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFormData({ ...formData, receipt: e.target.files?.[0] || null })}
                className="hidden"
                id="receipt"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('receipt')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Receipt
              </Button>
              {formData.receipt && (
                <span className="text-sm text-muted-foreground">
                  {formData.receipt.name}
                </span>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Receipt className="w-4 h-4 mr-2" />
            Submit Expense
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
