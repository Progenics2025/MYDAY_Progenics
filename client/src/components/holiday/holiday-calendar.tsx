import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Plus, Trash2, Edit2, Sparkles, PartyPopper } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

type Role = 'admin' | 'manager' | 'employee';

type Holiday = {
	id: number;
	name: string;
	date: string; // ISO yyyy-mm-dd
	type: 'Mandatory' | 'Flexi';
	appliesTo: string;
	icon?: string;
};

type Props = {
	role?: Role;
	initialData?: Holiday[];
};

const mockData: Holiday[] = [
	{ id: 1, name: 'New Year', date: '2025-01-01', type: 'Mandatory', appliesTo: 'All' },
	{ id: 2, name: 'Republic Day', date: '2025-01-26', type: 'Mandatory', appliesTo: 'All' },
	{ id: 3, name: 'Holi', date: '2025-03-14', type: 'Mandatory', appliesTo: 'All' },
	{ id: 4, name: 'Independence Day', date: '2025-08-15', type: 'Mandatory', appliesTo: 'All' },
];

import CalendarView from './calendar-view';

// ... (existing imports)

export default function HolidayCalendar({ role = 'employee', initialData }: Props) {
	const [year, setYear] = useState<number>(new Date().getFullYear());
	const [showModal, setShowModal] = useState(false);
	const [editing, setEditing] = useState<Holiday | null>(null);
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const { data: holidaysData, isLoading } = useQuery({
		queryKey: ['holidays', year],
		queryFn: async () => {
			const res = await apiRequest('GET', `/api/holidays?year=${year}`);
			const json = await res.json();
			return (json.items || []) as Holiday[];
		},
	});

	const holidays: Holiday[] = (holidaysData ?? initialData ?? mockData) as Holiday[];
	const { createHolidayMutation, updateHolidayMutation, deleteHolidayMutation } = useHolidayMutations(queryClient, year);

	const years = useMemo(() => {
		const y = new Date().getFullYear();
		return [y - 1, y, y + 1];
	}, []);

	const filtered = holidays.filter((h: Holiday) => new Date(h.date).getFullYear() === year);

	const handleSave = async (payload: Partial<Holiday> & { iconFile?: File | null }) => {
		try {
			if (editing) {
				await updateHolidayMutation.mutateAsync({ id: editing.id, payload } as any);
				toast({ title: "Success", description: "Holiday updated successfully" });
			} else {
				await createHolidayMutation.mutateAsync(payload as any);
				toast({ title: "Success", description: "Holiday created successfully" });
			}
			setShowModal(false);
			setEditing(null);
		} catch (err: any) {
			toast({ title: "Error", description: err.message || "Failed to save holiday", variant: "destructive" });
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm('Are you sure you want to delete this holiday?')) return;
		try {
			await deleteHolidayMutation.mutateAsync(id);
			toast({ title: "Success", description: "Holiday deleted successfully" });
		} catch (err: any) {
			toast({ title: "Error", description: err.message || "Failed to delete holiday", variant: "destructive" });
		}
	};

	return (
		<div className="space-y-8">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-2">
						<PartyPopper className="w-6 h-6 text-pink-500" />
						Holiday Calendar
					</h2>
					<p className="text-slate-500 dark:text-slate-400">Upcoming holidays and events</p>
				</div>

				<div className="flex items-center gap-3">
					{/* ... (existing controls) */}
					<Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
						<SelectTrigger className="w-[120px] bg-white dark:bg-slate-800">
							<SelectValue placeholder="Year" />
						</SelectTrigger>
						<SelectContent>
							{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
						</SelectContent>
					</Select>

					{['admin', 'manager'].includes(role) && (
						<Button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
							<Plus className="w-4 h-4 mr-2" />
							Add Holiday
						</Button>
					)}
				</div>
			</div>

			{/* Calendar View */}
			<CalendarView className="mb-8" />

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{/* ... (existing list) */}
				{filtered.map((h, index) => (
					<motion.div
						key={h.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
					>
						<Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-slate-900 relative">
							<div className={`absolute top-0 left-0 w-full h-1 ${h.type === 'Mandatory' ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`} />

							<CardContent className="p-6">
								<div className="flex justify-between items-start mb-4">
									<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${h.type === 'Mandatory' ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'}`}>
										{h.icon ? <img src={h.icon} alt="" className="w-full h-full object-cover rounded-2xl" /> : (h.type === 'Mandatory' ? '🎉' : '🌟')}
									</div>
									{['admin', 'manager'].includes(role) && (
										<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => { setEditing(h); setShowModal(true); }}>
												<Edit2 className="w-4 h-4" />
											</Button>
											<Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(h.id)}>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									)}
								</div>

								<h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={h.name}>{h.name}</h3>
								<div className="flex items-center text-sm text-slate-500 mb-4">
									<Calendar className="w-4 h-4 mr-1.5" />
									{format(new Date(h.date), 'EEEE, MMMM d')}
								</div>

								<div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
									<span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${h.type === 'Mandatory' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
										{h.type}
									</span>
									<span className="text-xs text-slate-400">{h.appliesTo}</span>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				))}

				{filtered.length === 0 && (
					<div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
						<Sparkles className="w-12 h-12 mb-4 opacity-20" />
						<p>No holidays found for {year}</p>
					</div>
				)}
			</div>

			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{editing ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
					</DialogHeader>
					<HolidayForm
						initial={editing}
						onSave={handleSave}
						onCancel={() => setShowModal(false)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function HolidayForm({ initial, onSave, onCancel }: { initial: Holiday | null, onSave: (p: any) => void, onCancel: () => void }) {
	const [name, setName] = useState(initial?.name || '');
	const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
	const [type, setType] = useState<Holiday['type']>(initial?.type || 'Mandatory');
	const [appliesTo, setAppliesTo] = useState(initial?.appliesTo || 'All');

	return (
		<div className="space-y-4 py-4">
			<div className="space-y-2">
				<Label>Holiday Name</Label>
				<Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Year" />
			</div>

			<div className="space-y-2">
				<Label>Date</Label>
				<Input type="date" value={date} onChange={e => setDate(e.target.value)} />
			</div>

			<div className="space-y-2">
				<Label>Type</Label>
				<RadioGroup value={type} onValueChange={(v) => setType(v as any)} className="flex gap-4">
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="Mandatory" id="mandatory" />
						<Label htmlFor="mandatory">Mandatory</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="Flexi" id="flexi" />
						<Label htmlFor="flexi">Flexi</Label>
					</div>
				</RadioGroup>
			</div>

			<div className="space-y-2">
				<Label>Applies To</Label>
				<Select value={appliesTo} onValueChange={setAppliesTo}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="All">All Employees</SelectItem>
						<SelectItem value="Some">Some Employees</SelectItem>
						<SelectItem value="Specific">Specific Employees</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<DialogFooter className="mt-6">
				<Button variant="outline" onClick={onCancel}>Cancel</Button>
				<Button onClick={() => onSave({ name, date, type, appliesTo })}>Save Holiday</Button>
			</DialogFooter>
		</div>
	);
}

function useHolidayMutations(queryClient: any, year: number) {
	const createHolidayMutation = useMutation({
		mutationFn: async (payload: any) => {
			const res = await apiRequest('POST', '/api/holidays', payload);
			return res.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', year] }),
	});

	const updateHolidayMutation = useMutation({
		mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
			const res = await apiRequest('PATCH', `/api/holidays/${id}`, payload);
			return res.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', year] }),
	});

	const deleteHolidayMutation = useMutation({
		mutationFn: async (id: number) => {
			const res = await apiRequest('DELETE', `/api/holidays/${id}`);
			return res.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays', year] }),
	});

	return { createHolidayMutation, updateHolidayMutation, deleteHolidayMutation };
}
