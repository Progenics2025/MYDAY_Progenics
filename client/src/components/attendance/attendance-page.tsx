import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Calendar, Users, CheckCircle, XCircle } from "lucide-react";
import AttendanceTracker from "./attendance-tracker";
import GPSPunch from "./gps-punch";
import LeaveRequestForm from "../leave/leave-request-form";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("punch");

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Today's Status</p>
                <p className="text-xl md:text-2xl font-bold text-blue-900">Present</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <div className="mt-3 text-xs md:text-sm text-blue-700">
              <p>In: 09:00 AM • Out: --:--</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Hours Today</p>
                <p className="text-xl md:text-2xl font-bold text-green-900">3.5</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <Clock className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <div className="mt-3 text-xs md:text-sm text-green-700">
              <p>Target: 8 hours</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Leave Balance</p>
                <p className="text-xl md:text-2xl font-bold text-purple-900">18</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="text-white w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <div className="mt-3 text-xs md:text-sm text-purple-700">
              <p>Days remaining this year</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Tabs */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 px-4 md:px-6 pt-4 md:pt-6">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-gray-100">
              <TabsTrigger 
                value="punch" 
                className="flex flex-col items-center gap-1 py-3 px-2 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600"
              >
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">GPS Punch</span>
                <span className="sm:hidden">Punch</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tracker" 
                className="flex flex-col items-center gap-1 py-3 px-2 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600"
              >
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Time Tracker</span>
                <span className="sm:hidden">Time</span>
              </TabsTrigger>
              <TabsTrigger 
                value="leave" 
                className="flex flex-col items-center gap-1 py-3 px-2 text-xs md:text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600"
              >
                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Leave Requests</span>
                <span className="sm:hidden">Leave</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="punch" className="p-4 md:p-6 mt-0">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">GPS Attendance</h3>
                <p className="text-sm text-gray-600">Mark your attendance with location tracking</p>
              </div>
              <GPSPunch />
            </div>
          </TabsContent>
          
          <TabsContent value="tracker" className="p-4 md:p-6 mt-0">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Attendance History</h3>
                <p className="text-sm text-gray-600">View and manage attendance records</p>
              </div>
              <AttendanceTracker />
            </div>
          </TabsContent>
          
          <TabsContent value="leave" className="p-4 md:p-6 mt-0">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Leave Management</h3>
                <p className="text-sm text-gray-600">Request and track your leave applications</p>
              </div>
              <LeaveRequestForm />
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
