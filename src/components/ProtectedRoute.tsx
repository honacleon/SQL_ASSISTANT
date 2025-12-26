// src/components/ProtectedRoute.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [checkingOrg, setCheckingOrg] = useState(true);
    const [hasOrg, setHasOrg] = useState(false);

    // Check if user is authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/auth');
        }
    }, [user, loading, navigate]);

    // Check if user has organization
    useEffect(() => {
        const checkOrganization = async () => {
            if (!user) return;

            try {
                const response = await apiClient.get('/api/organizations/me');
                if (response.data.hasOrganization) {
                    setHasOrg(true);
                } else {
                    // User doesn't have org, redirect to onboarding
                    navigate('/onboarding');
                    return;
                }
            } catch (error) {
                console.error('Error checking organization:', error);
                // If check fails, assume no org and redirect to onboarding
                navigate('/onboarding');
                return;
            } finally {
                setCheckingOrg(false);
            }
        };

        if (!loading && user) {
            checkOrganization();
        }
    }, [user, loading, navigate]);

    if (loading || checkingOrg) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!user || !hasOrg) {
        return null; // Will redirect in useEffect
    }

    return <>{children}</>;
};

