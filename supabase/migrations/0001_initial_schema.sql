-- AeroGlass ERP / EvA ERP Cloud - Supabase Schema Setup

-- Enable RLS on existing tables and add new tables
CREATE TABLE IF NOT EXISTS public.users (
    username text PRIMARY KEY,
    password text NOT NULL,
    role text NOT NULL,
    status text NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    status text NOT NULL,
    "createdAt" text
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.attendance (
    id text PRIMARY KEY,
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    date text NOT NULL,
    "checkIn" text,
    "checkOut" text,
    status text NOT NULL
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.transactions (
    id text PRIMARY KEY,
    "itemId" text REFERENCES public.inventory(id) ON DELETE CASCADE,
    type text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    "sourceOrPurpose" text,
    date text NOT NULL
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE public.gatepasses ENABLE ROW LEVEL SECURITY;

-- 11. Designs table
CREATE TABLE IF NOT EXISTS public.designs (
    id text PRIMARY KEY,
    project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'window', 'door', 'facade', 'partition'
    width numeric NOT NULL, -- in mm
    height numeric NOT NULL, -- in mm
    glass_type text NOT NULL, -- e.g., '6mm Clear', '8mm Frosted', '12mm Double-Glazed'
    profile_type text NOT NULL, -- e.g., 'Alu-Black-Matte', 'Alu-Rose-Gold', 'UPVC-White'
    layout_data jsonb NOT NULL DEFAULT '{}'::jsonb, -- 2D subdivisions (mullions/transoms)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- 12. Fittings / Hardware catalog table
CREATE TABLE IF NOT EXISTS public.fittings (
    id text PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    category text NOT NULL, -- 'hinge', 'handle', 'lock', 'roller', 'sealant'
    price numeric NOT NULL,
    unit text NOT NULL
);
ALTER TABLE public.fittings ENABLE ROW LEVEL SECURITY;

-- 13. Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id text PRIMARY KEY,
    project_id text REFERENCES public.projects(id) ON DELETE CASCADE,
    client_name text NOT NULL,
    total_price numeric NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb, -- detailed quotation lines
    status text NOT NULL DEFAULT 'Draft',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Setup Row-Level Security Policies (allow all access for demo and user authenticated operations)
CREATE POLICY "Allow public read" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public all" ON public.users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow projects all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow tasks all" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow employees all" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow attendance all" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow leaves all" ON public.leaves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow inventory all" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow transactions all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow gatepasses all" ON public.gatepasses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow designs all" ON public.designs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow fittings all" ON public.fittings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow quotes all" ON public.quotes FOR ALL USING (true) WITH CHECK (true);

-- Seed Default Admin User
INSERT INTO public.users (username, password, role, status)
VALUES ('admin', 'admin123', 'Admin', 'Active')
ON CONFLICT (username) DO NOTHING;

-- Seed Default Fittings catalog for doors/windows
INSERT INTO public.fittings (id, name, code, category, price, unit)
VALUES 
('fit-1', 'Heavy Duty Pivot Hinge', 'HINGE-HD-PIVOT', 'hinge', 45.00, 'pcs'),
('fit-2', 'Stainless Steel D-Handle 300mm', 'HANDLE-SS-D300', 'handle', 25.00, 'pcs'),
('fit-3', 'Multi-point Lock System', 'LOCK-MULTIPNT', 'lock', 60.00, 'pcs'),
('fit-4', 'Nylon Double Roller Wheel', 'ROLLER-NYLON-DBL', 'roller', 8.50, 'pcs'),
('fit-5', 'Dow Corning 791 Silicon Sealant', 'SEAL-SILICON-DC791', 'sealant', 12.00, 'tube'),
('fit-6', 'EPDM Weather Gasket', 'GASKET-EPDM-WEATHER', 'sealant', 1.50, 'meter')
ON CONFLICT (id) DO NOTHING;
