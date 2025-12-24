// src/pages/AuthPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { PasswordRecoveryForm } from '../components/auth/PasswordRecoveryForm';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthPage = () => {
    const [view, setView] = useState<'login' | 'signup' | 'recovery'>('login');
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Redirect to home if already logged in
    useEffect(() => {
        if (!loading && user) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    // Show loading while checking auth state
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If user is logged in, don't render the auth page (will redirect)
    if (user) {
        return null;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-[350px] space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">SQL Assistant</h1>
                    <p className="text-sm text-muted-foreground">Sua plataforma inteligente de dados</p>
                </div>

                {view === 'recovery' ? (
                    <PasswordRecoveryForm onBack={() => setView('login')} />
                ) : (
                    <Tabs defaultValue="login" className="w-full" onValueChange={(v) => setView(v as 'login' | 'signup')}>
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">Entrar</TabsTrigger>
                            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <LoginForm />
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => setView('recovery')}
                                    className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                                >
                                    Esqueceu sua senha?
                                </button>
                            </div>
                        </TabsContent>

                        <TabsContent value="signup">
                            <SignupForm />
                        </TabsContent>
                    </Tabs>
                )}

                {view !== 'recovery' && (
                    <>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-gray-50 dark:bg-gray-900 px-2 text-muted-foreground">
                                    Ou continue com
                                </span>
                            </div>
                        </div>
                        <GoogleLoginButton />
                    </>
                )}
            </div>
        </div>
    );
};

