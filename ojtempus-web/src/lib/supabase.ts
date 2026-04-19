import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables! ' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }
})

// ============================================
// DATABASE HELPERS (for real Supabase)
// ============================================

// Helper: Get user profile with OJT config
export async function getUserProfile() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      ojt_configurations (*)
    `)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    throw error
  }
  return data
}

// Helper: Update OJT configuration
export async function updateOJTConfig(config: {
  total_required_hours: number
  work_hours_per_day: number
  work_days_per_week: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Current user:', user)
  if (!user) throw new Error('Not authenticated')

  // Check if user exists in users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()
  
  console.log('User in database:', userData, 'Error:', userError)

  // If user doesn't exist in users table, create them
  if (userError || !userData) {
    console.log('Creating user in users table...')
    const { error: insertUserError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || '',
        display_name: user.email ? user.email.split('@')[0] : 'user',
        default_daily_hours: config.work_hours_per_day
      })
    
    if (insertUserError) {
      console.error('Error creating user:', insertUserError)
    }
  }

  const { data, error } = await supabase
    .from('ojt_configurations')
    .upsert(
      {
        user_id: user.id,
        ...config,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single()
  
  if (error) {
    console.error('Error updating OJT config:', JSON.stringify(error, null, 2))
    throw error
  }
  return data
}

// Helper: Check if user has OJT config
export async function hasOJTConfig(userId?: string): Promise<boolean> {
  try {
    const targetUserId = userId
    if (!targetUserId) return false

    const { data, error } = await supabase
      .from('ojt_configurations')
      .select('id')
      .eq('user_id', targetUserId)
      .single()
    
    if (error || !data) return false
    return true
  } catch {
    return false
  }
}

// Helper: Get OJT config
export async function getOJTConfig() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('ojt_configurations')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  if (error) return null
  return data
}

// ============================================
// TIME TRACKING FUNCTIONS
// ============================================

// Helper: Get today's time entry
export async function getTodayEntry() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('entry_date', today)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching today entry:', error)
    return null
  }
  return data
}

// Helper: Clock in
export async function clockIn() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()
  const today = now.split('T')[0]
  
  // Check if entry already exists for today
  const existingEntry = await getTodayEntry()
  
  if (existingEntry) {
    if (existingEntry.clock_in) {
      throw new Error('Already clocked in today')
    }
    // Update existing entry with clock_in
    const { data, error } = await supabase
      .from('time_entries')
      .update({ clock_in: now })
      .eq('id', existingEntry.id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  // Create new entry with clock_in
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: user.id,
      entry_date: today,
      clock_in: now,
      hours_worked: 0,
      is_auto_clock_out: false,
      manual_entry: false
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Helper: Clock out (manual or auto)
export async function clockOut(isAuto = false) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()
  const today = now.split('T')[0]
  
  // Get today's entry
  const entry = await getTodayEntry()
  if (!entry || !entry.clock_in) {
    throw new Error('No clock-in record found for today')
  }
  
  if (entry.clock_out) {
    throw new Error('Already clocked out today')
  }
  
  // Calculate hours worked
  const clockInTime = new Date(entry.clock_in)
  const clockOutTime = new Date(now)
  const hoursWorked = parseFloat(((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)).toFixed(2))
  
  const { data, error } = await supabase
    .from('time_entries')
    .update({
      clock_out: now,
      hours_worked: hoursWorked,
      is_auto_clock_out: isAuto
    })
    .eq('id', entry.id)
    .select()
    .single()
  
  if (error) throw error
  
  // Create edit log for clock out hours
  try {
    await createEditLog({
      user_id: user.id,
      time_entry_id: entry.id,
      edit_type: isAuto ? 'auto_clock_out' : 'clock_out',
      previous_hours: 0,
      new_hours: hoursWorked,
      hours_difference: hoursWorked,
      entry_date: today,
      reason: isAuto ? 'Auto clock out based on work hours' : 'Manual clock out',
      notes: null,
      edited_by: user.id
    })
  } catch (logError) {
    console.error('Error creating clock out edit log:', logError)
  }
  
  return data
}

// Helper: Auto clock out based on work hours
export async function autoClockOut(workHoursPerDay: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get today's entry
  const entry = await getTodayEntry()
  if (!entry || !entry.clock_in || entry.clock_out) {
    return null // Nothing to auto-clock-out
  }
  
  // Calculate expected clock out time
  const clockInTime = new Date(entry.clock_in)
  const expectedClockOut = new Date(clockInTime.getTime() + (workHoursPerDay * 60 * 60 * 1000))
  const now = new Date()
  
  // Only auto clock out if expected time has passed
  if (now >= expectedClockOut) {
    return await clockOut(true)
  }
  
  return null // Not time yet
}

// Helper: Update hours manually (for edit mode)
export async function updateManualHours(entryId: string, hours: number, notes?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      hours_worked: hours,
      manual_entry: true,
      notes: notes || null
    })
    .eq('id', entryId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: Create edit log entry
export async function createEditLog(log: Omit<EditLog, 'id' | 'created_at'>): Promise<EditLog> {
  const { data, error } = await supabase
    .from('edit_logs')
    .insert(log)
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: Create or update manual entry for any date (for logging past/rendered hours)
export async function createOrUpdateManualEntry(date: string, hours: number, notes?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check if entry already exists for this date
  const { data: existingEntry, error: fetchError } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('entry_date', date)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error checking existing entry:', fetchError)
    throw fetchError
  }

  if (existingEntry) {
    // Update existing entry - add hours to existing hours
    const previousHours = existingEntry.hours_worked || 0
    const newHours = previousHours + hours
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        hours_worked: newHours,
        manual_entry: true,
        notes: notes || existingEntry.notes || null
      })
      .eq('id', existingEntry.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    
    // Manually create edit log for the hours adjustment
    try {
      await createEditLog({
        user_id: user.id,
        time_entry_id: existingEntry.id,
        edit_type: previousHours === 0 ? 'manual_entry' : 'hours_adjustment',
        previous_hours: previousHours,
        new_hours: newHours,
        hours_difference: hours,
        entry_date: date,
        reason: notes || 'Manual hours entry',
        notes: null,
        edited_by: user.id
      })
    } catch (logError) {
      console.error('Error creating edit log:', logError)
      // Don't throw - the entry was still updated
    }
    
    return data
  } else {
    // Create new entry for this date
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        entry_date: date,
        hours_worked: hours,
        manual_entry: true,
        notes: notes || null
      })
      .select()
      .single()

    if (error) throw error
    
    // Manually create edit log for new entry
    try {
      await createEditLog({
        user_id: user.id,
        time_entry_id: data.id,
        edit_type: 'manual_entry',
        previous_hours: null,
        new_hours: hours,
        hours_difference: hours,
        entry_date: date,
        reason: notes || 'Manual hours entry',
        notes: null,
        edited_by: user.id
      })
    } catch (logError) {
      console.error('Error creating edit log:', logError)
      // Don't throw - the entry was still created
    }
    
    return data
  }
}

// Helper: Get total hours worked (all time)
export async function getTotalHoursWorked(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data, error } = await supabase
    .from('time_entries')
    .select('hours_worked')
    .eq('user_id', user.id)
  
  if (error || !data) return 0
  
  return data.reduce((total, entry) => total + (entry.hours_worked || 0), 0)
}

// Helper: Get all time entries for a date range
export async function getTimeEntries(startDate?: string, endDate?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })

  if (startDate) {
    query = query.gte('entry_date', startDate)
  }
  if (endDate) {
    query = query.lte('entry_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching time entries:', error)
    return []
  }
  return data || []
}

// ============================================
// WORK SCHEDULE FUNCTIONS
// ============================================

export interface WorkSchedule {
  id: string
  user_id: string
  title: string
  description: string | null
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  estimated_hours: number
  actual_hours: number
  created_at: string
  updated_at: string
  completed_at: string | null
  notes: string | null
}

export async function getWorkSchedules(status?: string): Promise<WorkSchedule[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching work schedules:', error)
    return []
  }
  return data || []
}

export async function getUpcomingWorkSchedules(): Promise<WorkSchedule[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .in('status', ['pending', 'in_progress'])
    .order('scheduled_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching upcoming work schedules:', error)
    return []
  }
  return data || []
}

export async function createWorkSchedule(schedule: Omit<WorkSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<WorkSchedule> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('work_schedules')
    .insert({
      ...schedule,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWorkSchedule(id: string, updates: Partial<WorkSchedule>): Promise<WorkSchedule> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updateData: Record<string, unknown> = { ...updates }
  if (updates.status === 'completed' && !updates.completed_at) {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('work_schedules')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWorkSchedule(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('work_schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

// ============================================
// EDIT LOG FUNCTIONS
// ============================================

export interface EditLog {
  id: string
  user_id: string
  time_entry_id: string
  edit_type: 'hours_adjustment' | 'manual_entry' | 'correction' | 'bulk_entry' | 'clock_out' | 'auto_clock_out'
  previous_hours: number | null
  new_hours: number
  hours_difference: number
  entry_date: string | null
  reason: string | null
  notes: string | null
  created_at: string
  edited_by: string | null
}

export async function getEditLogs(): Promise<EditLog[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('edit_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching edit logs:', error)
    return []
  }
  return data || []
}

export async function getEditLogsWithEntryDetails(): Promise<(EditLog & { entry_date: string })[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('edit_logs')
    .select(`
      *,
      time_entries!inner(entry_date)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching edit logs with details:', error)
    return []
  }

  return (data || []).map((log: Record<string, unknown>) => ({
    ...log,
    entry_date: (log.time_entries as { entry_date: string }).entry_date
  })) as (EditLog & { entry_date: string })[]
}

export async function updateEditLog(id: string, updates: Partial<EditLog>): Promise<EditLog> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('edit_logs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
