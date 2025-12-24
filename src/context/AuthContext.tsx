// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AuthContextProps {
    user: any | null;
    session: Session | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<any>;
    signup: (email: string, password: string, orgName?: string) => Promise<any>;
    logout: () => Promise<void>;
    googleLogin: () => Promise<any>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signup = async (email: string, password: string, orgName?: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // After signup, create organization if name provided
        if (orgName && data.user) {
            // Call backend endpoint to create organization (requires token)
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            await fetch('/api/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: orgName })
            });
        }
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const googleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, login, signup, logout, googleLogin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
