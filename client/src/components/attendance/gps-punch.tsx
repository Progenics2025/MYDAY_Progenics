import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { MapPin, Clock, Navigation, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/lib/auth';
import { Attendance } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';

export default function GPSPunch() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { employee } = useAuthState();

  const { data: todayAttendance, isLoading: isAttendanceLoading } = useQuery<Attendance>({
    queryKey: [`/api/attendance/today/${employee?.employeeId}`],
    enabled: !!employee?.employeeId,
  });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Allow punch-in if there's no today record or the latest record has punchOut set
  const canPunchIn = !todayAttendance || !!todayAttendance.punchOut;
  const canPunchOut = !!todayAttendance && !!todayAttendance.punchIn && !todayAttendance.punchOut;

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
        setError(null);
      },
      (error) => {
        setError('Unable to retrieve your location. Please check your browser permissions.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);


  const handlePunch = async (type: 'in' | 'out') => {
    try {
      setLoading(true);
      setError(null);

      // Get fresh GPS location before punch
      let currentLocation: GeolocationPosition | null = null;

      try {
        currentLocation = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        });
        setLocation(currentLocation);
      } catch (geoError) {
        // Fall back to cached location if fresh location fails
        if (location) {
          currentLocation = location;
          console.warn('Using cached location due to GPS error:', geoError);
        } else {
          setError('Unable to get your location. Please enable location access and try again.');
          setLoading(false);
          return;
        }
      }

      const endpoint = type === 'in' ? '/api/attendance/punch-in' : '/api/attendance/punch-out';
      const response = await apiRequest('POST', endpoint, {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        employeeId: employee?.employeeId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to punch ${type}`);
      }

      toast({
        title: type === 'in' ? "Checked In Successfully" : "Checked Out Successfully",
        description: `Marked attendance at ${new Date().toLocaleTimeString()}`,
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/attendance/today/${employee?.employeeId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {/* Left Column: Punch Controls */}
      <div className="space-y-6">
        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -mr-8 -mt-8" />
          <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px] relative z-10">

            {/* Live Clock */}
            <div className="text-center mb-10">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Current Time</h3>
              <div className="text-5xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <p className="text-slate-400 mt-2 font-medium">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Animated Punch Button */}
            <div className="relative">
              {/* Ripple Effects */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full ${canPunchIn ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
              />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className={`absolute inset-0 rounded-full ${canPunchIn ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}
              />

              {/* Main Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePunch(canPunchIn ? 'in' : 'out')}
                disabled={loading || isAttendanceLoading || (!location && !error)}
                className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 z-10 border-8 ${canPunchIn
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 border-indigo-100 dark:border-indigo-900/50 text-white shadow-indigo-500/30'
                  : 'bg-gradient-to-br from-red-500 to-pink-600 border-red-100 dark:border-red-900/50 text-white shadow-red-500/30'
                  }`}
              >
                {loading ? (
                  <RefreshCw className="w-10 h-10 animate-spin mb-2" />
                ) : (
                  <div className="bg-white/20 p-3 rounded-full mb-2 backdrop-blur-sm">
                    {canPunchIn ? <Navigation className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                  </div>
                )}
                <span className="text-xl font-bold tracking-wide">
                  {loading ? 'Processing' : (canPunchIn ? 'PUNCH IN' : 'PUNCH OUT')}
                </span>
              </motion.button>
            </div>

            {/* Status Message */}
            <div className="mt-8 text-center">
              {error ? (
                <div className="flex items-center text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              ) : location ? (
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Location Verified</span>
                </div>
              ) : (
                <div className="flex items-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm font-medium">Acquiring Location...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Map & Location Details */}
      <div className="space-y-6">
        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden h-full flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
              Current Location
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={getCurrentLocation}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 h-8"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex-1 bg-slate-100 dark:bg-slate-800 relative min-h-[300px]">
            {location ? (
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}&z=15&output=embed`}
                className="absolute inset-0 w-full h-full opacity-90 hover:opacity-100 transition-opacity"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                <MapPin className="w-12 h-12 mb-2 opacity-20" />
                <p>Waiting for location...</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Latitude</p>
                <p className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                  {location?.coords.latitude.toFixed(6) || '--'}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Longitude</p>
                <p className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                  {location?.coords.longitude.toFixed(6) || '--'}
                </p>
              </div>
            </div>
            {location && (
              <div className="mt-3 flex items-center justify-center text-xs text-slate-400">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                GPS Accuracy: ±{Math.round(location.coords.accuracy)} meters
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
