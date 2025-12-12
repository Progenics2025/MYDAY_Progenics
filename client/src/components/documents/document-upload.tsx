import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileUp, File, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

export default function DocumentUpload() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    file: null as File | null,
  });
  const [formErrors, setFormErrors] = useState({
    type: '',
    name: '',
    file: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    const errors = {
      type: '',
      name: '',
      file: '',
    };
    let isValid = true;

    if (!formData.type) {
      errors.type = 'Document type is required';
      isValid = false;
    }

    if (!formData.name.trim()) {
      errors.name = 'Document name is required';
      isValid = false;
    }

    if (!formData.file) {
      errors.file = 'Please select a file';
      isValid = false;
    } else {
      const fileError = validateFile(formData.file);
      if (fileError) {
        errors.file = fileError;
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF or image file (JPG, JPEG, PNG).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size too large. Maximum allowed size is 5MB.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    data.append('documentType', formData.type);
    data.append('documentName', formData.name.trim());
    if (formData.file) {
      data.append('file', formData.file);
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header, let the browser set it with the boundary
        },
        body: data,
      });

      let errorData;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(errorData.message || 'Failed to upload document');
      }

      // Only try to parse response as JSON if it is JSON
      let result;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = errorData;
      } else {
        result = { message: 'Document uploaded successfully' };
      }
      
      // Reset form
      setFormData({
        type: '',
        name: '',
        file: null,
      });
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      // Clear file input
      const fileInput = document.getElementById('document') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Error uploading document:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            <File className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Uploading...' : 'Upload Document'}
            
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
