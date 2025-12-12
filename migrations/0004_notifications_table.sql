-- Migration: create notifications table

DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  notification_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  manager_id UUID,
  employee_id UUID,
  payload JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ
);

-- index for manager_id and employee_id
CREATE INDEX IF NOT EXISTS idx_notifications_manager ON notifications(manager_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
