import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, MapPin, Clock, Navigation, Users, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MapComponent from './MapComponent';

interface LocationPoint {
    id: string;
    employee_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
    speed?: number;
}

interface EmployeeTracking {
    employeeId: string;
    employeeName: string;
    department: string;
    locationPoints: number;
    totalDistanceKm: number;
    visitCount: number;
    lastLocation: LocationPoint | null;
    trail: LocationPoint[];
}

interface Visit {
    id: string;
    employee_id: string;
    latitude: number;
    longitude: number;
    address?: string;
    place_name?: string;
    arrival_time: string;
    departure_time?: string;
    duration_minutes?: number;
    visit_type: string;
    notes?: string;
}

export default function FieldTrackingDashboard() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
    const [currentAddress, setCurrentAddress] = useState<string>('');

    const token = localStorage.getItem('token');

    // Fetch all employees' tracking data for the selected date
    const { data: trackingData, isLoading: isLoadingTracking, refetch } = useQuery({
        queryKey: ['field-tracking', format(selectedDate, 'yyyy-MM-dd')],
        queryFn: async () => {
            const res = await fetch(
                `/api/location/all-employees?date=${format(selectedDate, 'yyyy-MM-dd')}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Failed to fetch tracking data');
            return res.json();
        }
    });

    // Fetch visits for selected employee
    const { data: visitsData, isLoading: isLoadingVisits } = useQuery({
        queryKey: ['field-visits', selectedEmployee, format(selectedDate, 'yyyy-MM-dd')],
        queryFn: async () => {
            if (selectedEmployee === 'all') return { visits: [] };
            const res = await fetch(
                `/api/location/visits/${selectedEmployee}?date=${format(selectedDate, 'yyyy-MM-dd')}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Failed to fetch visits');
            return res.json();
        },
        enabled: selectedEmployee !== 'all'
    });

    // Stats
    const employees: EmployeeTracking[] = trackingData?.employees || [];
    const totalEmployeesTracked = employees.length;
    const totalDistance = employees.reduce((sum, e) => sum + e.totalDistanceKm, 0);
    const totalVisits = employees.reduce((sum, e) => sum + e.visitCount, 0);

    const selectedEmployeeData = employees.find(e => e.employeeId === selectedEmployee);

    // Fetch address for selected employee's last location
    useEffect(() => {
        if (selectedEmployeeData?.lastLocation) {
            const { latitude, longitude } = selectedEmployeeData.lastLocation;
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                .then(res => res.json())
                .then(data => setCurrentAddress(data.display_name))
                .catch(err => console.error('Failed to fetch address', err));
        } else {
            setCurrentAddress('');
        }
    }, [selectedEmployeeData?.lastLocation]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Field Tracking Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track employee locations and visits in real-time</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, 'PPP')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Employee Filter */}
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Employees</SelectItem>
                            {employees.map((emp) => (
                                <SelectItem key={emp.employeeId} value={emp.employeeId}>
                                    {emp.employeeName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => refetch()} variant="outline">
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEmployeesTracked}</div>
                        <p className="text-xs text-muted-foreground">Employees tracked today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDistance.toFixed(1)} km</div>
                        <p className="text-xs text-muted-foreground">Combined distance traveled</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalVisits}</div>
                        <p className="text-xs text-muted-foreground">Client visits recorded</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Location Points</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {employees.reduce((sum, e) => sum + e.locationPoints, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">GPS points recorded</p>
                    </CardContent>
                </Card>
            </div>

            {/* Map Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Live Location Map</CardTitle>
                    <CardDescription>
                        {selectedEmployee === 'all'
                            ? 'Showing all employee locations'
                            : `Showing route for ${selectedEmployeeData?.employeeName || selectedEmployee}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {selectedEmployee === 'all' ? (
                            <div className="h-full flex items-center justify-center bg-gray-100 text-gray-500">
                                Select an employee to view their specific route and live location.
                            </div>
                        ) : (
                            <MapComponent
                                trail={selectedEmployeeData?.trail || []}
                                visits={visitsData?.visits || []}
                                selectedEmployeeName={selectedEmployeeData?.employeeName}
                            />
                        )}
                    </div>

                    {selectedEmployeeData && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="font-semibold mb-2">Current Status</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Last Updated:</span><br />
                                    {selectedEmployeeData.lastLocation
                                        ? format(new Date(selectedEmployeeData.lastLocation.timestamp), 'pp')
                                        : 'N/A'}
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-gray-500">Current Location:</span><br />
                                    {currentAddress || (selectedEmployeeData.lastLocation
                                        ? `${selectedEmployeeData.lastLocation.latitude.toFixed(6)}, ${selectedEmployeeData.lastLocation.longitude.toFixed(6)}`
                                        : 'Unknown')}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee Tracking Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Employee Location Summary</CardTitle>
                    <CardDescription>Overview of all employees' field activity for {format(selectedDate, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingTracking ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No tracking data available for this date
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead className="text-right">Distance (km)</TableHead>
                                    <TableHead className="text-right">Visits</TableHead>
                                    <TableHead className="text-right">Location Points</TableHead>
                                    <TableHead>Last Update</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((emp) => (
                                    <TableRow
                                        key={emp.employeeId}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => setSelectedEmployee(emp.employeeId)}
                                    >
                                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{emp.department || 'N/A'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{emp.totalDistanceKm.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{emp.visitCount}</TableCell>
                                        <TableCell className="text-right">{emp.locationPoints}</TableCell>
                                        <TableCell>
                                            {emp.lastLocation
                                                ? format(new Date(emp.lastLocation.timestamp), 'HH:mm:ss')
                                                : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Visits Table (shown when employee is selected) */}
            {selectedEmployee !== 'all' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Visits for {selectedEmployeeData?.employeeName || selectedEmployee}</CardTitle>
                        <CardDescription>
                            Client visits and stops recorded on {format(selectedDate, 'PPP')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingVisits ? (
                            <div className="text-center py-8 text-gray-500">Loading visits...</div>
                        ) : (visitsData?.visits || []).length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No visits recorded for this employee on this date
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Arrival</TableHead>
                                        <TableHead>Departure</TableHead>
                                        <TableHead className="text-right">Duration</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(visitsData?.visits || []).map((visit: Visit) => (
                                        <TableRow key={visit.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{visit.place_name || 'Unknown Location'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {visit.address || `${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}`}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        visit.visit_type === 'client' ? 'default' :
                                                            visit.visit_type === 'office' ? 'secondary' :
                                                                'outline'
                                                    }
                                                >
                                                    {visit.visit_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(visit.arrival_time), 'HH:mm')}</TableCell>
                                            <TableCell>
                                                {visit.departure_time
                                                    ? format(new Date(visit.departure_time), 'HH:mm')
                                                    : <Badge variant="outline">Ongoing</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {visit.duration_minutes
                                                    ? `${visit.duration_minutes} min`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {visit.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
