// src/components/csv/CsvUploadZone.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle, Trash2, File } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api';

interface CsvUpload {
    id: string;
    originalFilename: string;
    displayName: string;
    tableName: string;
    rowCount: number;
    columnCount: number;
    status: 'processing' | 'ready' | 'error' | 'expired';
    createdAt: string;
    expiresAt: string | null;
    errorMessage?: string;
}

interface CsvLimits {
    maxFileSize: number;
    maxFileSizeMB: number;
    maxRows: number;
    maxColumns: number;
    maxTablesPerOrg: number;
}

export const CsvUploadZone = () => {
    const [uploads, setUploads] = useState<CsvUpload[]>([]);
    const [limits, setLimits] = useState<CsvLimits | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [expiresIn, setExpiresIn] = useState<string>('7d');
    const [displayName, setDisplayName] = useState<string>('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    // Load uploads on mount
    React.useEffect(() => {
        loadUploads();
        loadLimits();
    }, []);

    const loadUploads = async () => {
        try {
            const response = await apiClient.get('/api/csv/tables');
            setUploads(response.data.data || []);
        } catch (error) {
            console.error('Error loading uploads:', error);
        }
    };

    const loadLimits = async () => {
        try {
            const response = await apiClient.get('/api/csv/limits');
            setLimits(response.data.data);
        } catch (error) {
            console.error('Error loading limits:', error);
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        // Set default name from file name (without extension)
        const defaultName = file.name.replace(/\.[^.]+$/, '').substring(0, 50);
        setDisplayName(defaultName);
        setPendingFile(file);
    }, []);

    const handleUpload = async () => {
        if (!pendingFile) return;

        setUploadError(null);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', pendingFile);
            formData.append('expiresIn', expiresIn);
            formData.append('displayName', displayName.trim() || pendingFile.name.replace(/\.[^.]+$/, ''));

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            const response = await apiClient.post('/api/csv/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.data.success) {
                await loadUploads();
                setTimeout(() => {
                    setUploadProgress(0);
                    setPendingFile(null);
                    setDisplayName('');
                }, 1000);
            }
        } catch (error: any) {
            setUploadError(error.response?.data?.error || error.message || 'Erro no upload');
        } finally {
            setIsUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'text/plain': ['.txt'],
        },
        maxSize: limits?.maxFileSize || 50 * 1024 * 1024,
        multiple: false,
        disabled: isUploading,
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

        try {
            await apiClient.delete(`/api/csv/tables/${id}`);
            await loadUploads();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao excluir');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-gold-400" />
                    Upload de CSV
                </CardTitle>
                <CardDescription>
                    Faça upload de arquivos CSV para consultar com linguagem natural
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Upload Zone */}
                <div
                    {...getRootProps()}
                    className={cn(
                        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                        isDragActive
                            ? 'border-gold-400 bg-gold-400/10'
                            : 'border-border hover:border-gold-400/50 hover:bg-secondary/50',
                        isUploading && 'pointer-events-none opacity-50'
                    )}
                >
                    <input {...getInputProps()} />
                    <Upload className={cn('h-10 w-10 mx-auto mb-4', isDragActive ? 'text-gold-400' : 'text-muted-foreground')} />
                    {isDragActive ? (
                        <p className="text-gold-400 font-medium">Solte o arquivo aqui...</p>
                    ) : (
                        <div className="space-y-1">
                            <p className="font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
                            <p className="text-sm text-muted-foreground">
                                Máximo {limits?.maxFileSizeMB || 50}MB • {limits?.maxRows?.toLocaleString() || '100.000'} linhas • {limits?.maxColumns || 50} colunas
                            </p>
                        </div>
                    )}
                </div>

                {/* File Selected - Configure Name */}
                {pendingFile && !isUploading && (
                    <div className="p-4 rounded-lg border border-gold-400/30 bg-gold-400/5 space-y-4">
                        <div className="flex items-center gap-3">
                            <File className="h-8 w-8 text-gold-400" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{pendingFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(pendingFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setPendingFile(null); setDisplayName(''); }}
                                className="text-muted-foreground hover:text-red-500"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="displayName">Nome da Tabela</Label>
                            <Input
                                id="displayName"
                                placeholder="Ex: Vendas 2024"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="border-border/50 focus:border-gold-400/50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Este nome aparecerá na lista de tabelas disponíveis.
                            </p>
                        </div>

                        <Button
                            onClick={handleUpload}
                            className="w-full bg-gold-400 hover:bg-gold-500 text-black font-medium"
                            disabled={!displayName.trim()}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar Arquivo
                        </Button>
                    </div>
                )}

                {/* Options */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Expiração:</span>
                        <Select value={expiresIn} onValueChange={setExpiresIn}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24h">24 horas</SelectItem>
                                <SelectItem value="7d">7 dias</SelectItem>
                                <SelectItem value="30d">30 dias</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {uploads.length}/{limits?.maxTablesPerOrg || 10} tabelas
                    </div>
                </div>

                {/* Progress */}
                {isUploading && (
                    <div className="space-y-2">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-sm text-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
                            Processando arquivo...
                        </p>
                    </div>
                )}

                {/* Error */}
                {uploadError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{uploadError}</span>
                        <Button variant="ghost" size="sm" onClick={() => setUploadError(null)} className="ml-auto p-1 h-auto">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Uploads List */}
                {uploads.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Arquivos Enviados</h4>
                        <div className="divide-y divide-border rounded-lg border">
                            {uploads.map((upload) => (
                                <div key={upload.id} className="flex items-center gap-3 p-3">
                                    {upload.status === 'ready' && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                                    {upload.status === 'processing' && <Loader2 className="h-4 w-4 text-gold-400 animate-spin flex-shrink-0" />}
                                    {upload.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{upload.displayName || upload.originalFilename}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {upload.rowCount?.toLocaleString()} linhas • {upload.columnCount} colunas • {formatDate(upload.createdAt)}
                                        </p>
                                    </div>

                                    <Badge variant={upload.status === 'ready' ? 'default' : upload.status === 'error' ? 'destructive' : 'secondary'}>
                                        {upload.status === 'ready' ? 'Pronto' : upload.status === 'error' ? 'Erro' : 'Processando'}
                                    </Badge>

                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(upload.id)} className="text-muted-foreground hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CsvUploadZone;
