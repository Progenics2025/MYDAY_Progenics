import React, { useEffect, useState } from 'react';
import { useAuthState } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UserCircle, Upload } from 'lucide-react';

interface ProfileData {
  phoneNumber: string;
  emergencyContact: string;
  address: string;
  dateOfBirth: string;
  joinDate?: string;
  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  skills: string[];
  education: string[];
  experience: string[];
  department?: string;
  role?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  uanNumber?: string;
  esicNumber?: string;
  bankAccount?: string;
  ifscCode?: string;
  photo?: string | File | null;
}

export default function ProfileForm() {
  const { user, refresh } = useAuthState();
  // allow all authenticated users to update their own profile (HR/Admin pages control permission elsewhere)
  const isEmployeeReadOnly = false;
  const showChangePassword = user?.role && user.role !== 'admin';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileData>({
    phoneNumber: '',
    emergencyContact: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    skills: [],
    education: [],
    experience: [],
    photo: null,
    panNumber: '',
    aadhaarNumber: '',
    uanNumber: '',
    esicNumber: '',
    bankAccount: '',
    ifscCode: '',
    department: '',
    role: '',
  });

  // Leave balances are shown on the Dashboard (moved from profile)

  const transformApiData = (apiData: any): ProfileData => {
    // map different possible keys to the frontend shape
    return {
      phoneNumber: apiData.phoneNumber || apiData.phone_number || apiData.phone || '',
      emergencyContact: apiData.emergencyContact || apiData.emergency_contact || apiData.emergency || '',
      address: apiData.address || apiData.user_address || '',
      department: apiData.department || apiData.dept || '',
      role: apiData.role || apiData.position || '',
      dateOfBirth: apiData.dateOfBirth || apiData.date_of_birth || '',
      joinDate: apiData.joinDate || apiData.join_date || '',
      gender: apiData.gender || '',
      bloodGroup: apiData.bloodGroup || apiData.blood_group || '',
      maritalStatus: apiData.maritalStatus || apiData.marital_status || '',
      panNumber: apiData.panNumber || apiData.pan_number || apiData.pan || '',
      aadhaarNumber: apiData.aadhaarNumber || apiData.aadhaar_number || apiData.aadhaar || '',
      uanNumber: apiData.uanNumber || apiData.uan_number || apiData.uan || '',
      esicNumber: apiData.esicNumber || apiData.esic_number || apiData.esic || '',
      bankAccount: apiData.bankAccount || apiData.bank_account || apiData.bankAccount || '',
      ifscCode: apiData.ifscCode || apiData.ifsc_code || apiData.ifsc || '',
      skills: Array.isArray(apiData.skills) ? apiData.skills : (apiData.skills ? String(apiData.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
      education: Array.isArray(apiData.education) ? apiData.education : (apiData.education ? [apiData.education] : []),
      experience: Array.isArray(apiData.experience) ? apiData.experience : (apiData.experience ? [apiData.experience] : []),
      photo: apiData.photo || apiData.profilePhotoUrl || null,
    };
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('No authentication token found');
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 404) {
            // no profile yet — show empty form
            setIsLoading(false);
            return;
          }
          throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const profile = data.profile || data.data || data;
        const transformed = transformApiData(profile || {});

        // Normalize dateOfBirth to YYYY-MM-DD for date input if present
        const normalized = {
          ...transformed,
          dateOfBirth: transformed.dateOfBirth ? new Date(transformed.dateOfBirth).toISOString().split('T')[0] : '',
          joinDate: transformed.joinDate ? new Date(transformed.joinDate).toISOString().split('T')[0] : '',
        } as ProfileData;
        setFormData(prev => ({ ...prev, ...normalized, photo: normalized.photo || null }));
      } catch (err: any) {
        console.error('Failed to load profile', err);
        setError(err?.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchProfileData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmployeeReadOnly) return;
    try {
      setError(null);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // When a photo file is present, send multipart/form-data so multer parses req.file
      let response: Response;
      if ((formData.photo as any) instanceof File) {
        const fd = new FormData();
        fd.append('photo', formData.photo as File);
        // append other fields as strings so multer will populate req.body
        fd.append('phoneNumber', formData.phoneNumber || '');
        fd.append('emergencyContact', formData.emergencyContact || '');
        fd.append('address', formData.address || '');
        // dates should be sent in ISO yyyy-mm-dd format
        fd.append('dateOfBirth', formData.dateOfBirth || '');
        fd.append('gender', formData.gender || '');
        fd.append('bloodGroup', formData.bloodGroup || '');
        fd.append('maritalStatus', formData.maritalStatus || '');
        fd.append('department', (formData as any).department || '');
        fd.append('role', (formData as any).role || '');
        fd.append('skills', Array.isArray(formData.skills) ? formData.skills.join(',') : String(formData.skills || ''));
        fd.append('education', Array.isArray(formData.education) ? JSON.stringify(formData.education) : JSON.stringify([]));
        fd.append('experience', Array.isArray(formData.experience) ? JSON.stringify(formData.experience) : JSON.stringify([]));
        fd.append('panNumber', (formData as any).panNumber || '');
        fd.append('aadhaarNumber', (formData as any).aadhaarNumber || '');
        fd.append('uanNumber', (formData as any).uanNumber || '');
        fd.append('esicNumber', (formData as any).esicNumber || '');
        fd.append('bankAccount', (formData as any).bankAccount || '');
        fd.append('ifscCode', (formData as any).ifscCode || '');

        response = await fetch('/api/profile', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        });
      } else {
        // submit as JSON (no file)
        const payload = {
          phoneNumber: formData.phoneNumber,
          emergencyContact: formData.emergencyContact,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup,
          maritalStatus: formData.maritalStatus,
          department: (formData as any).department,
          role: (formData as any).role,
          skills: formData.skills,
          education: formData.education,
          experience: formData.experience,
          panNumber: (formData as any).panNumber,
          aadhaarNumber: (formData as any).aadhaarNumber,
          uanNumber: (formData as any).uanNumber,
          esicNumber: (formData as any).esicNumber,
          bankAccount: (formData as any).bankAccount,
          ifscCode: (formData as any).ifscCode,
        };

        response = await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to update profile: ${response.status}`);
      }

      const saved = await response.json().catch(() => null);
      console.debug('Profile saved successfully', saved);

      // Refresh global auth state so header avatar updates (hook's refresh may be async)
      try {
        if (typeof refresh === 'function') await refresh();
        // also reload the profile endpoint to keep the form in sync
        const res2 = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (res2.ok) {
          const reloaded = await res2.json();
          const profile = reloaded.profile || reloaded.data || reloaded;
          setFormData(prev => ({ ...prev, ...transformApiData(profile || {}), photo: null }));
        }
      } catch (e) {
        console.error('Failed to refresh auth/profile after save', e);
      }
    } catch (err: any) {
      console.error('Failed to update profile', err);
      setError(err?.message || 'Failed to update profile');
    }
  };

  // Change password handler
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!showChangePassword) return;
    setError(null);
    if (!currentPassword) return setError('Current password is required');
    if (!newPassword || newPassword.length < 8) return setError('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('New password and confirm password do not match');

    try {
      setChanging(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return setError('No authentication token found');

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to change password: ${res.status}`);
      }

      // success
      alert('Password changed successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password', err);
      setError(err?.message || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <div>Loading profile data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center space-y-4 mb-6">
            <div className="relative w-32 h-32">
              {formData.photo ? (
                <img
                  src={(formData.photo as any) instanceof File ? URL.createObjectURL(formData.photo as File) : formData.photo as string}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 shadow-lg"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-slate-50 dark:border-slate-700">
                  <UserCircle className="w-16 h-16 text-slate-300" />
                </div>
              )}
              {!isEmployeeReadOnly && (
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFormData({ ...formData, photo: file });
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
                placeholder="Enter phone number"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency Contact</label>
              <Input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                required
                placeholder="Enter emergency contact"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input
                type="text"
                value={(formData as any).department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Department"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input
                type="text"
                value={(formData as any).role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Role"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              rows={3}
              placeholder="Enter full address"
              readOnly={isEmployeeReadOnly}
              disabled={isEmployeeReadOnly}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Gender</label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
              disabled={isEmployeeReadOnly}
            >
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                required
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Join Date</label>
              <Input
                type="date"
                value={(formData as any).joinDate || ''}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                readOnly={true}
                disabled={false}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Blood Group</label>
              <Select
                value={formData.bloodGroup}
                onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}
                disabled={isEmployeeReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Marital Status</label>
              <Select
                value={formData.maritalStatus}
                onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                disabled={isEmployeeReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">PAN Number</label>
              <Input
                type="text"
                value={(formData as any).panNumber || ''}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                placeholder="PAN"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aadhaar Number</label>
              <Input
                type="text"
                value={(formData as any).aadhaarNumber || ''}
                onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                placeholder="Aadhaar"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">UAN</label>
              <Input
                type="text"
                value={(formData as any).uanNumber || ''}
                onChange={(e) => setFormData({ ...formData, uanNumber: e.target.value })}
                placeholder="UAN (12 digits) or 'NA'"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ESIC Number</label>
              <Input
                type="text"
                value={(formData as any).esicNumber || ''}
                onChange={(e) => setFormData({ ...formData, esicNumber: e.target.value })}
                placeholder="ESIC (6-17 chars) or 'NA'"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Account</label>
              <Input
                type="text"
                value={(formData as any).bankAccount || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="Bank account number"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">IFSC Code</label>
              <Input
                type="text"
                value={(formData as any).ifscCode || ''}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                placeholder="IFSC"
                readOnly={isEmployeeReadOnly}
                disabled={isEmployeeReadOnly}
              />
            </div>
          </div>

          {!isEmployeeReadOnly && (
            <Button type="submit" className="w-full">
              <UserCircle className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          )}

        </form>

        {/* Change Password section for non-admin users - Moved outside main form */}
        {showChangePassword && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChangePassword();
              }}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={changing}>
                {changing ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
