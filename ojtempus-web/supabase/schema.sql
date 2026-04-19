-- OJTempus Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ============================================
-- This table stores additional user profile data
-- The id references the auth.users table from Supabase Auth

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT, -- Derived from email (part before @)
    default_daily_hours DECIMAL(4,2) DEFAULT 8.00, -- Default work hours per day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own data
CREATE POLICY "Users can read own profile" 
    ON public.users 
    FOR SELECT 
    USING (auth.uid() = id);

-- RLS Policy: Users can only update their own data
CREATE POLICY "Users can update own profile" 
    ON public.users 
    FOR UPDATE 
    USING (auth.uid() = id);

-- ============================================
-- 2. OJT CONFIGURATIONS TABLE
-- ============================================
-- Stores OJT requirements and work schedule settings per user

CREATE TABLE IF NOT EXISTS public.ojt_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- OJT Requirements
    total_required_hours DECIMAL(6,2) NOT NULL DEFAULT 500.00, -- Total hours needed to finish OJT
    work_hours_per_day DECIMAL(4,2) NOT NULL DEFAULT 8.00, -- Daily work hours for calculation
    work_days_per_week INTEGER NOT NULL DEFAULT 5, -- Days per week (1-7)
    
    -- Calculated fields (can be computed in app, but stored for quick reference)
    estimated_weeks_to_complete DECIMAL(6,2) GENERATED ALWAYS AS (
        CASE 
            WHEN work_hours_per_day > 0 AND work_days_per_week > 0 THEN 
                total_required_hours / (work_hours_per_day * work_days_per_week)
            ELSE 0
        END
    ) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each user can only have one OJT configuration
    CONSTRAINT unique_user_config UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.ojt_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own OJT config
CREATE POLICY "Users can read own OJT config" 
    ON public.ojt_configurations 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OJT config" 
    ON public.ojt_configurations 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OJT config" 
    ON public.ojt_configurations 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own OJT config" 
    ON public.ojt_configurations 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================
-- 3. TRIGGER: Auto-create user profile on signup
-- ============================================

-- Function to extract display name from email and create user record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    email_local_part TEXT;
BEGIN
    -- Extract the part before @ from email
    email_local_part := split_part(NEW.email, '@', 1);
    
    -- Insert into users table
    INSERT INTO public.users (id, email, display_name, default_daily_hours)
    VALUES (
        NEW.id,
        NEW.email,
        email_local_part,
        8.00 -- default daily hours
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after a new user signs up via Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. FUNCTION: Update timestamp on modify
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ojt_config_updated_at ON public.ojt_configurations;
CREATE TRIGGER update_ojt_config_updated_at
    BEFORE UPDATE ON public.ojt_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ojt_configurations TO authenticated;

-- ============================================
-- SAMPLE QUERIES (for reference)
-- ============================================

-- Get user with their OJT config
-- SELECT u.*, o.total_required_hours, o.work_hours_per_day, o.work_days_per_week, o.estimated_weeks_to_complete
-- FROM public.users u
-- LEFT JOIN public.ojt_configurations o ON u.id = o.user_id
-- WHERE u.id = auth.uid();

-- Update OJT configuration
-- UPDATE public.ojt_configurations
-- SET total_required_hours = 600,
--     work_hours_per_day = 7.5,
--     work_days_per_week = 6
-- WHERE user_id = auth.uid();
