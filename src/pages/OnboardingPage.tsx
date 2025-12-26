/**
 * OnboardingPage - Create organization for new users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Sparkles, ArrowRight, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export function OnboardingPage() {
    const navigate = useNavigate();
    const { user, logout, loading: authLoading } = useAuth();
    const [orgName, setOrgName] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    // Check if user already has organization
    useEffect(() => {
        const checkOrg = async () => {
            if (!user) return;

            try {
                const response = await apiClient.get('/api/organizations/me');
                if (response.data.hasOrganization) {
                    // User already has org, redirect to dashboard
                    navigate('/dashboard', { replace: true });
                    return;
                }
            } catch (error) {
                console.error('Error checking organization:', error);
            } finally {
                setChecking(false);
            }
        };

        if (!authLoading && user) {
            checkOrg();
        } else if (!authLoading && !user) {
            navigate('/auth', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!orgName.trim() || orgName.trim().length < 2) {
            toast.error('Nome da organização deve ter pelo menos 2 caracteres');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post('/api/organizations', { name: orgName.trim() });

            if (response.data.success) {
                toast.success('Organização criada com sucesso! Redirecionando...');

                // Redirect directly to dashboard - the org check will pass now since it's in the database
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 1000);
            }
        } catch (error: any) {
            const message = error.response?.data?.error || 'Erro ao criar organização';
            toast.error(message);
            setLoading(false);
        }
        // Don't setLoading(false) on success to keep button disabled during redirect
    };

    const handleLogout = async () => {
        await logout();
        navigate('/auth', { replace: true });
    };

    if (authLoading || checking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
                    <p className="text-muted-foreground">Verificando sua conta...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-gold-400/5 flex items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground">
                    <LogOut className="h-4 w-4" />
                    Sair
                </Button>
            </div>

            <Card className="w-full max-w-md border-gold-400/20 bg-card/95 backdrop-blur">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gold-400/10 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-gold-400" />
                    </div>
                    <CardTitle className="text-2xl">Bem-vindo ao SQL Assistant!</CardTitle>
                    <CardDescription className="text-base">
                        Para começar, crie sua organização. Isso permitirá gerenciar seus dados de forma segura.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleCreateOrg} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="orgName">Nome da Organização</Label>
                            <Input
                                id="orgName"
                                placeholder="Ex: Minha Empresa"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                disabled={loading}
                                className="h-12 border-border/50 focus:border-gold-400/50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Pode ser o nome da sua empresa, equipe ou projeto.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-gold-400 hover:bg-gold-500 text-black font-medium gap-2"
                            disabled={loading || !orgName.trim()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Criar Organização
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="text-xs text-muted-foreground text-center">
                            <strong className="text-foreground">Logado como:</strong>{' '}
                            {user?.email}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default OnboardingPage;
