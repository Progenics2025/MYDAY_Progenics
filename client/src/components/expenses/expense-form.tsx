import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Receipt, Upload } from 'lucide-react';

export default function ExpenseForm() {
  const [formData, setFormData] = useState({
    date: '',
    category: '',
    amount: '',
    description: '',
    receipt: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) throw new Error('Failed to submit expense');
      
      // Handle success
    } catch (error) {
      // Handle error
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
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
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
