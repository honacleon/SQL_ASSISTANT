// src/components/auth/PasswordRecoveryForm.tsx
import React, { useState } from 'react';
import { supabase } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '../ui/card';
import { Label } from '../ui/label';

export const PasswordRecoveryForm = ({ onBack }: { onBack: () => void }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });
            if (error) throw error;
            setMessage('Verifique seu e-mail para o link de redefinição.');
        } catch (err: any) {
            setError(err.message || 'Erro ao solicitar redefinição');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Recuperar Senha</CardTitle>
                <CardDescription>Digite seu e-mail para receber o link</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="recovery-email">Email</Label>
                        <Input
                            id="recovery-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    {message && <p className="text-sm text-green-500">{message}</p>}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Link'}
                    </Button>
                    <Button variant="link" className="w-full" onClick={onBack} type="button">
                        Voltar para o login
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};
