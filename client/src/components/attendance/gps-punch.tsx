import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MapPin, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/lib/auth';
import { Attendance } from '@shared/schema';

export default function GPSPunch() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { employee } = useAuthState();

  const { data: todayAttendance, isLoading: isAttendanceLoading } = useQuery<Attendance>({
    queryKey: [`/api/attendance/today/${employee?.employeeId}`],
    enabled: !!employee?.employeeId,
  });

  const canPunchIn = !todayAttendance || !todayAttendance.punchIn;
  const canPunchOut = todayAttendance && todayAttendance.punchIn && !todayAttendance.punchOut;

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
        setLoading(false);
      },
      (error) => {
        setError('Unable to retrieve your location');
        setLoading(false);
      }
    );
  };

  const handlePunchIn = async () => {
    if (!location) {
      setError('Please enable location access');
      return;
    }

    try {
      setLoading(true);
      await apiRequest('POST', '/api/attendance/punch-in', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      
      toast({
        title: "Success",
        description: "Successfully punched in with GPS location",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/attendance/today/${employee?.employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance');
      toast({
        title: "Error",
        description: err.message || 'Failed to record attendance',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!location) {
      setError('Please enable location access');
      return;
    }

    try {
      setLoading(true);
      await apiRequest('POST', '/api/attendance/punch-out', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
      
      toast({
        title: "Success",
        description: "Successfully punched out with GPS location",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/attendance/today/${employee?.employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to record attendance');
      toast({
        title: "Error",
        description: err.message || 'Failed to record attendance',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Location Status Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">GPS Location</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {location
                    ? `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                    : 'Getting location...'}
                </span>
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{new Date().toLocaleString()}</span>
              </div>
              
              {location && (
                <div className="text-xs text-green-600 text-center">
                  Accuracy: ±{Math.round(location.coords.accuracy)}m
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-700 text-sm text-center">{error}</div>
              </div>
            )}

            {!location && !error && (
              <Button
                onClick={getCurrentLocation}
                variant="outline"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Getting Location...' : 'Enable Location Access'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {location && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handlePunchIn}
            disabled={loading || !canPunchIn || isAttendanceLoading}
            className="h-14 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <div className="flex flex-col items-center">
              <Clock className="w-5 h-5 mb-1" />
              {loading || isAttendanceLoading ? 'Processing...' : 'Punch In'}
            </div>
          </Button>
          
          <Button
            onClick={handlePunchOut}
            disabled={loading || !canPunchOut || isAttendanceLoading}
            className="h-14 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <div className="flex flex-col items-center">
              <Clock className="w-5 h-5 mb-1" />
              {loading || isAttendanceLoading ? 'Processing...' : 'Punch Out'}
            </div>
          </Button>
        </div>
      )}

      {location && (
        <Button
          onClick={getCurrentLocation}
          variant="outline"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Refreshing Location...' : 'Refresh Location'}
        </Button>
      )}
    </div>
  );
}
