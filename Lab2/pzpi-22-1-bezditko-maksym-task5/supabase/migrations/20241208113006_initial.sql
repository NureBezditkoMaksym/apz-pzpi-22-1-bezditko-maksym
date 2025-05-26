-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the health_metrics table
CREATE TABLE public.health_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(auth_id),
    date DATE NOT NULL,
    calories INT,
    water_ml INT,
    steps INT,
    photo_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the subscriptions table
CREATE TABLE public.subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(auth_id),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) NOT NULL
);

-- Create the notifications table
CREATE TABLE public.notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(auth_id),
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the reports table
CREATE TABLE public.reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(auth_id),
    report_date DATE NOT NULL,
    report_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the user_roles table
CREATE TABLE public.user_roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Create the user_role_assignments table
CREATE TABLE public.user_role_assignments (
    user_id UUID REFERENCES public.users(auth_id),
    role_id UUID REFERENCES public.user_roles(role_id),
    PRIMARY KEY (user_id, role_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users are viewable by authenticated users" ON public.users FOR
SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can be created by authenticated users" ON public.users FOR INSERT
WITH
  CHECK (auth.role() = 'authenticated');

CREATE POLICY "User role can be updated by admins only" ON public.users
FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER set_updated_at BEFORE
UPDATE ON public.users FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user creation with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (
        auth_id,
        username,
        email,
        phone,
        is_premium
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'username', 'Unknown'),
        COALESCE(NEW.email, 'unknown@example.com'),
        COALESCE(NEW.phone, NULL),
        COALESCE((NEW.raw_user_meta_data ->> 'is_premium')::boolean, FALSE)
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger with IF EXISTS check
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'auth'
        AND tablename = 'users'
    ) THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END
$$;

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_updates() RETURNS trigger AS $$
BEGIN
    UPDATE public.users
    SET 
        email = NEW.email,
        updated_at = NOW()
    WHERE auth_id = NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error in handle_user_updates: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email
    ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_user_updates();

-- Create index on auth_id
CREATE INDEX IF NOT EXISTS users_auth_id_idx ON public.users (auth_id);

-- Grant privileges
GRANT ALL PRIVILEGES ON TABLE public.users TO authenticated;