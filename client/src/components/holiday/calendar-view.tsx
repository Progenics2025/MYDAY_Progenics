import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

type Holiday = {
    id: number;
    name: string;
    date: string;
    type: 'Mandatory' | 'Flexi';
};

type LeaveRequest = {
    id: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    status: string;
    reason: string;
    employeeName?: string;
};

export default function CalendarView({ className }: { className?: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Fetch Holidays
    const { data: holidays } = useQuery({
        queryKey: ['holidays', currentMonth.getFullYear()],
        queryFn: async () => {
            const res = await apiRequest('GET', `/api/holidays?year=${currentMonth.getFullYear()}`);
            const json = await res.json();
            return (json.items || []) as Holiday[];
        },
    });

    // Fetch Leaves (Approved only)
    const { data: leaves } = useQuery({
        queryKey: ['leave-requests', 'approved'],
        queryFn: async () => {
            // Fetching a large page size to get most recent leaves. 
            // Ideally backend should support date range filtering.
            const res = await apiRequest('GET', `/api/leave-requests?status=approved&pageSize=1000`);
            return await res.json();
        },
    });

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth)),
    });

    const getEventsForDay = (date: Date) => {
        const dayHolidays = holidays?.filter(h => isSameDay(new Date(h.date), date)) || [];

        const dayLeaves = leaves?.items?.filter((l: LeaveRequest) => {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            // Reset times to compare dates only
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const current = new Date(date);
            current.setHours(0, 0, 0, 0);
            return current >= start && current <= end;
        }) || [];

        return { holidays: dayHolidays, leaves: dayLeaves };
    };

    return (
        <Card className={cn("border-none shadow-xl bg-white dark:bg-slate-900", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-500" />
                    {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-xs font-medium text-slate-500 py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, dayIdx) => {
                        const { holidays, leaves } = getEventsForDay(day);
                        const hasHoliday = holidays.length > 0;
                        const hasLeave = leaves.length > 0;
                        const isCurrentMonth = isSameMonth(day, currentMonth);

                        return (
                            <div key={day.toString()} className="relative group">
                                <div
                                    className={cn(
                                        "min-h-[40px] p-1 flex flex-col items-center justify-start rounded-lg cursor-pointer transition-colors relative",
                                        !isCurrentMonth && "text-slate-300 dark:text-slate-700 bg-slate-50/50 dark:bg-slate-900/50",
                                        isCurrentMonth && "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                                        isToday(day) && "ring-2 ring-indigo-500 ring-offset-2",
                                        (hasHoliday || hasLeave) && "font-semibold"
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs mb-1",
                                        hasHoliday && "text-pink-600 dark:text-pink-400",
                                        hasLeave && !hasHoliday && "text-blue-600 dark:text-blue-400"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Indicators */}
                                    <div className="flex gap-0.5">
                                        {hasHoliday && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                        )}
                                        {hasLeave && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        )}
                                    </div>
                                </div>

                                {/* Simple CSS-based tooltip as fallback/debug */}
                                {(hasHoliday || hasLeave) && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-slate-800 shadow-xl rounded-md z-50 hidden group-hover:block border border-slate-200 dark:border-slate-700">
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-sm border-b pb-1 mb-2 text-slate-900 dark:text-white">{format(day, 'EEEE, MMM d')}</h4>
                                            {holidays.map((h: Holiday) => (
                                                <div key={h.id} className="flex items-center gap-2 text-xs text-pink-600">
                                                    <Badge variant="outline" className="border-pink-200 bg-pink-50 text-pink-700">Holiday</Badge>
                                                    <span>{h.name}</span>
                                                </div>
                                            ))}
                                            {leaves.map((l: LeaveRequest) => (
                                                <div key={l.id} className="flex items-center gap-2 text-xs text-blue-600">
                                                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Leave</Badge>
                                                    <span>{l.employeeName || 'Employee'} - {l.leaveType}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-pink-500" />
                        <span>Holiday</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>On Leave</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
