-- ============================================
-- WORK SCHEDULES TABLE
-- ============================================
-- Stores upcoming work schedules/tasks for users

CREATE TABLE IF NOT EXISTS public.work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Schedule Details
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    
    -- Work Details
    estimated_hours DECIMAL(5,2) DEFAULT 0,
    actual_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own work schedules" ON public.work_schedules;
CREATE POLICY "Users can read own work schedules"
    ON public.work_schedules
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own work schedules" ON public.work_schedules;
CREATE POLICY "Users can insert own work schedules"
    ON public.work_schedules
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own work schedules" ON public.work_schedules;
CREATE POLICY "Users can update own work schedules"
    ON public.work_schedules
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own work schedules" ON public.work_schedules;
CREATE POLICY "Users can delete own work schedules"
    ON public.work_schedules
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- EDIT LOGS TABLE (for tracking hour adjustments)
-- ============================================
-- Tracks all edits made to time entries for audit trail

CREATE TABLE IF NOT EXISTS public.edit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE CASCADE,
    
    -- Edit Details
    edit_type TEXT NOT NULL, -- 'hours_adjustment', 'manual_entry', 'correction', 'bulk_entry'
    previous_hours DECIMAL(5,2),
    new_hours DECIMAL(5,2),
    hours_difference DECIMAL(5,2), -- Calculated: new - previous
    
    -- Context
    entry_date DATE, -- The date of the time entry that was edited
    reason TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL -- For admin edits
);

-- Enable RLS
ALTER TABLE public.edit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own edit logs" ON public.edit_logs;
CREATE POLICY "Users can read own edit logs"
    ON public.edit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own edit logs" ON public.edit_logs;
CREATE POLICY "Users can insert own edit logs"
    ON public.edit_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete edit logs (audit trail)

-- ============================================
-- TRIGGER: Auto-update work_schedules updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_work_schedules_updated_at ON public.work_schedules;
CREATE TRIGGER update_work_schedules_updated_at
    BEFORE UPDATE ON public.work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-create edit log when time_entries is updated
-- ============================================
CREATE OR REPLACE FUNCTION public.create_edit_log_on_time_entry_update()
RETURNS TRIGGER AS $$
DECLARE
    edit_reason TEXT;
    edit_type_val TEXT;
BEGIN
    -- Only create log if hours_worked changed and it's a manual operation
    IF NEW.hours_worked <> OLD.hours_worked AND NEW.manual_entry = TRUE THEN
        
        -- Determine edit type based on previous state
        IF OLD.manual_entry = FALSE THEN
            edit_type_val := 'correction';
        ELSIF OLD.hours_worked = 0 THEN
            edit_type_val := 'manual_entry';
        ELSE
            edit_type_val := 'hours_adjustment';
        END IF;
        
        -- Get reason from notes if available
        edit_reason := COALESCE(NEW.notes, 'Manual edit');
        
        INSERT INTO public.edit_logs (
            user_id,
            time_entry_id,
            edit_type,
            previous_hours,
            new_hours,
            hours_difference,
            entry_date,
            reason,
            notes,
            edited_by
        ) VALUES (
            NEW.user_id,
            NEW.id,
            edit_type_val,
            OLD.hours_worked,
            NEW.hours_worked,
            NEW.hours_worked - COALESCE(OLD.hours_worked, 0),
            NEW.entry_date,
            edit_reason,
            NEW.notes,
            NEW.user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating edit logs
DROP TRIGGER IF EXISTS auto_create_edit_log ON public.time_entries;
CREATE TRIGGER auto_create_edit_log
    AFTER UPDATE ON public.time_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.create_edit_log_on_time_entry_update();

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_id ON public.work_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_scheduled_date ON public.work_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_status ON public.work_schedules(status);
CREATE INDEX IF NOT EXISTS idx_edit_logs_user_id ON public.edit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_time_entry_id ON public.edit_logs(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_edit_logs_created_at ON public.edit_logs(created_at);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT SELECT, INSERT ON public.edit_logs TO authenticated;

-- ============================================
-- SAMPLE QUERIES (for reference)
-- ============================================

-- Get upcoming work schedules
-- SELECT * FROM public.work_schedules
-- WHERE user_id = auth.uid()
--   AND scheduled_date >= CURRENT_DATE
--   AND status IN ('pending', 'in_progress')
-- ORDER BY scheduled_date, start_time;

-- Get edit history for a user
-- SELECT el.*, te.entry_date
-- FROM public.edit_logs el
-- JOIN public.time_entries te ON el.time_entry_id = te.id
-- WHERE el.user_id = auth.uid()
-- ORDER BY el.created_at DESC;

-- Get total hours added through manual edits
-- SELECT SUM(hours_difference) as total_adjusted_hours
-- FROM public.edit_logs
-- WHERE user_id = auth.uid()
--   AND hours_difference > 0;
