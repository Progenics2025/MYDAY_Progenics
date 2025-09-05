import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileUp, File } from 'lucide-react';

export default function DocumentUpload() {
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    file: null as File | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) throw new Error('Failed to upload document');
      
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Type</label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aadhar">Aadhaar Card</SelectItem>
                <SelectItem value="pan">PAN Card</SelectItem>
                <SelectItem value="offer_letter">Offer Letter</SelectItem>
                <SelectItem value="certificate">Certificates</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Document Name</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter document name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">File</label>
            <div className="flex items-center space-x-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="hidden"
                id="document"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('document')?.click()}
              >
                <FileUp className="w-4 h-4 mr-2" />
                Choose File
              </Button>
              {formData.file && (
                <span className="text-sm text-muted-foreground">
                  {formData.file.name}
                </span>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full">
            <File className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
