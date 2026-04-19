# Supabase Integration Guide for OJTempus

## Overview
This guide walks you through setting up Supabase for live data collection in your OJTempus project.

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Enter project details:
   - **Name:** ojtempus
   - **Database Password:** (create a strong password, save it)
   - **Region:** Choose closest to your users (e.g., Singapore for SE Asia)
4. Click **"Create new project"** (takes ~2 minutes)

---

## Step 2: Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents from `supabase/schema.sql` and paste it
4. Click **"Run"** (green button)
5. You should see: ✅ "Success. No rows returned"

**What this creates:**
- `users` table - stores profile data linked to auth
- `ojt_configurations` table - stores OJT hours/days settings
- Automatic triggers - creates user profile on signup
- Row Level Security - users only see their own data

---

## Step 3: Get Your API Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **URL** (e.g., `https://xxxxxxxxxxxxxxxxx.supabase.co`)
   - **anon/public** key (starts with `eyJ...`)
3. Go to **Project Settings** → **Data API** → check that "Enable Data API" is ON

---

## Step 4: Create Environment Variables

Create `.env.local` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important:** Never commit this file! It's already in `.gitignore`.

---

## Step 5: Install Supabase Client

```bash
cd ojtempus-web
npm install @supabase/supabase-js
```

---

## Step 6: Create Supabase Client File

Create `src/lib/supabase.ts` - this connects your app to Supabase:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Helper: Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper: Get user profile with OJT config
export async function getUserProfile() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      ojt_configurations (*)
    `)
    .single()
  
  if (error) throw error
  return data
}

// Helper: Update OJT configuration
export async function updateOJTConfig(config: {
  total_required_hours: number
  work_hours_per_day: number
  work_days_per_week: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('ojt_configurations')
    .upsert({
      user_id: user.id,
      ...config,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

---

## Step 7: Update Signup Page

Replace your current signup with Supabase Auth:

```typescript
import { supabase } from '../lib/supabase'

// In your signup function:
async function handleSignup(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    console.error('Signup error:', error.message)
    return { success: false, error: error.message }
  }
  
  // User automatically created in public.users via trigger
  return { success: true, user: data.user }
}
```

---

## Step 8: Create Onboarding Page

This is where users input OJT settings after signup:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateOJTConfig } from '../lib/supabase'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState({
    total_required_hours: 500,
    work_hours_per_day: 8,
    work_days_per_week: 5
  })

  async function handleSubmit() {
    try {
      await updateOJTConfig(config)
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  return (
    <div className="onboarding-container">
      <h1>Setup Your OJT</h1>
      
      <label>Total Required Hours</label>
      <input 
        type="number" 
        value={config.total_required_hours}
        onChange={e => setConfig(c => ({ ...c, total_required_hours: Number(e.target.value) }))}
      />
      
      <label>Work Hours Per Day</label>
      <input 
        type="number" 
        value={config.work_hours_per_day}
        onChange={e => setConfig(c => ({ ...c, work_hours_per_day: Number(e.target.value) }))}
      />
      
      <label>Work Days Per Week</label>
      <input 
        type="number" 
        min={1} max={7}
        value={config.work_days_per_week}
        onChange={e => setConfig(c => ({ ...c, work_days_per_week: Number(e.target.value) }))}
      />
      
      <button onClick={handleSubmit}>Continue to Dashboard</button>
    </div>
  )
}
```

---

## Quick Checklist

- [ ] Supabase project created
- [ ] SQL schema executed in SQL Editor
- [ ] API credentials copied to `.env.local`
- [ ] `@supabase/supabase-js` installed
- [ ] `src/lib/supabase.ts` client created
- [ ] Signup page updated to use Supabase Auth
- [ ] Onboarding page created for OJT config
- [ ] Routes updated in App.tsx

---

## Testing the Integration

1. Sign up a new user → check `users` table in Supabase
2. Complete onboarding → check `ojt_configurations` table
3. Verify Row Level Security: try accessing data from another account

## Next Features to Add

After setup, you can add:
- Login/logout with Supabase Auth
- Real-time OJT hours tracking
- File uploads to Supabase Storage
- Push notifications
