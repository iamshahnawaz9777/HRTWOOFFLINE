-- AeroGlass ERP - Supabase Database Schema Setup
-- Run this script in your Supabase SQL Editor to initialize all tables!

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
    username text PRIMARY KEY,
    password text NOT NULL,
    role text NOT NULL,
    status text NOT NULL
);
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    status text NOT NULL,
    "createdAt" text
);
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- 3. Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id text PRIMARY KEY,
    "projectId" text REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    assignees jsonb NOT NULL DEFAULT '[]'::jsonb,
    deadline text,
    priority text,
    status text NOT NULL,
    subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
    "activityLog" jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- 4. Employees table
CREATE TABLE IF NOT EXISTS public.employees (
    id text PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL,
    department text NOT NULL,
    contact text,
    "joiningDate" text,
    documents jsonb NOT NULL DEFAULT '[]'::jsonb,
    "leaveBalance" numeric DEFAULT 0,
    salary text
);
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- 5. Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id text PRIMARY KEY,
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    date text NOT NULL,
    "checkIn" text,
    "checkOut" text,
    status text NOT NULL
);
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- 6. Leaves table
CREATE TABLE IF NOT EXISTS public.leaves (
    id text PRIMARY KEY,
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    type text NOT NULL,
    "startDate" text NOT NULL,
    "endDate" text NOT NULL,
    reason text,
    status text NOT NULL,
    "approvedBy" text
);
ALTER TABLE public.leaves DISABLE ROW LEVEL SECURITY;

-- 7. Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
    id text PRIMARY KEY,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    category text NOT NULL,
    unit text NOT NULL,
    description text,
    "minStock" numeric DEFAULT 0,
    "currentStock" numeric DEFAULT 0
);
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;

-- 8. Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id text PRIMARY KEY,
    "itemId" text REFERENCES public.inventory(id) ON DELETE CASCADE,
    type text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    "sourceOrPurpose" text,
    date text NOT NULL
);
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 9. Gatepasses table
CREATE TABLE IF NOT EXISTS public.gatepasses (
    id text PRIMARY KEY,
    "gatePassNo" text NOT NULL UNIQUE,
    date text NOT NULL,
    status text NOT NULL,
    person jsonb NOT NULL DEFAULT '{}'::jsonb,
    vehicle jsonb NOT NULL DEFAULT '{}'::jsonb,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    returnable boolean NOT NULL DEFAULT false,
    returns jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.gatepasses DISABLE ROW LEVEL SECURITY;

-- 10. Seed Default Admin User
INSERT INTO public.users (username, password, role, status)
VALUES ('admin', 'admin123', 'Admin', 'Active')
ON CONFLICT (username) DO NOTHING;
