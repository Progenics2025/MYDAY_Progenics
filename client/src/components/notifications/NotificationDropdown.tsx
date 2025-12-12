import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuthState } from '@/lib/auth';

export default function NotificationDropdown() {
  const { user } = useAuthState();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const isAdmin = !!(user && ['admin', 'manager'].includes(((user.role || '') as string).toLowerCase()));
  const endpoint = isAdmin ? '/api/notify/leave-requests/list' : '/api/notify/leave-requests/me';

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${endpoint}?page=1&pageSize=10`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        // data may be { items: [...] } or array
        const list = Array.isArray(data) ? data : (data.items || []);
        setItems(list);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    // fetch once when component mounts
    fetchItems();
  }, [endpoint]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
        data-testid="button-notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center text-white">{items.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded shadow-lg z-50 p-3">
          <h4 className="font-semibold mb-2">Notifications</h4>
          {loading && <div>Loading...</div>}
          {!loading && items.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
          <ul className="space-y-2 max-h-64 overflow-auto">
            {items.map((it: any) => (
              <li key={it.id || it.notification_id || Math.random()} className="p-2 border rounded">
                <div className="text-sm font-medium">{it.employee_name || it.employeeName || it.employeeId || 'Employee'}</div>
                <div className="text-xs text-muted-foreground">{it.leave_type || it.leaveType || ''} • {it.status || ''}</div>
                <div className="text-sm mt-1">{it.reason || ''}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
