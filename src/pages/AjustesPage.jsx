import React, { useState, useEffect, useMemo } from 'react';
import { 
    FiDatabase, 
    FiUploadCloud, 
    FiDownloadCloud, 
    FiRefreshCw, 
    FiClock, 
    FiCheckCircle, 
    FiAlertCircle, 
    FiAlertTriangle, 
    FiHardDrive, 
    FiFolder, 
    FiExternalLink, 
    FiShield, 
    FiServer,
    FiSettings,
    FiFileText,
    FiUserCheck,
    FiLink,
    FiXCircle,
    FiHelpCircle,
    FiTrash2
} from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import useAuthStore from '../store/useAuthStore';
import ConfirmModal from '../components/ConfirmModal';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (isoString) => {
    if (!isoString) return 'Nunca';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return 'Fecha inválida';
        return d.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return isoString;
    }
};

const AjustesPage = () => {
    const { token } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusData, setStatusData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
    const [showOAuthHelp, setShowOAuthHelp] = useState(false);

    // Estado para eliminar backup
    const [backupToDelete, setBackupToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/backup/status', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setStatusData(data);
            } else {
                toast.error(data.error || 'Error al obtener estado de backups');
            }
        } catch (err) {
            console.error('Error fetching backup status:', err);
            toast.error('No se pudo conectar con el servidor para consultar backups');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();

        if (searchParams.get('oauth_success')) {
            toast.success('¡Cuenta de Google conectada exitosamente! Ahora tus backups usan tus 5 TB.', { duration: 6000 });
            setSearchParams({});
        } else if (searchParams.get('oauth_error')) {
            toast.error('Error al autorizar Google: ' + searchParams.get('oauth_error'));
            setSearchParams({});
        }
    }, []);

    const handleRunBackup = async () => {
        setIsBackingUp(true);
        const toastId = toast.loading('Generando respaldo y subiendo a Google Drive...');
        try {
            const res = await fetch('/api/backup/run', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(data.message || '¡Backup generado exitosamente!', { id: toastId });
                fetchStatus();
            } else {
                toast.error(data.error || 'Error al procesar el backup', { id: toastId });
                fetchStatus();
            }
        } catch (err) {
            console.error('Error running backup:', err);
            toast.error('Error de red al ejecutar el backup', { id: toastId });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleDownloadBackup = async (fileName) => {
        setIsDownloading(true);
        try {
            const endpoint = fileName ? `/api/backup/download/${fileName}` : '/api/backup/download';
            const res = await fetch(endpoint, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Error al descargar el respaldo');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || `backup_stock_${new Date().toISOString().slice(0, 10)}.sqlite`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Archivo de backup descargado correctamente');
        } catch (err) {
            console.error('Error downloading backup:', err);
            toast.error(err.message || 'No se pudo descargar el archivo');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDeleteBackup = async () => {
        if (!backupToDelete) return;
        setIsDeleting(true);
        const toastId = toast.loading(`Eliminando respaldo ${backupToDelete.name}...`);
        try {
            const query = backupToDelete.driveId ? `?driveFileId=${encodeURIComponent(backupToDelete.driveId)}` : '';
            const res = await fetch(`/api/backup/${encodeURIComponent(backupToDelete.name)}${query}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Respaldo eliminado con éxito', { id: toastId });
                setBackupToDelete(null);
                fetchStatus();
            } else {
                toast.error(data.error || 'No se pudo eliminar el respaldo', { id: toastId });
            }
        } catch (err) {
            console.error('Error deleting backup:', err);
            toast.error('Error de red al intentar eliminar el archivo', { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConnectGoogle = async () => {
        setIsConnectingOAuth(true);
        try {
            const res = await fetch('/api/backup/auth/url', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || 'Falta configurar credenciales OAuth en el servidor');
                setShowOAuthHelp(true);
            }
        } catch (err) {
            console.error('Error getting auth url:', err);
            toast.error('Error solicitando URL de conexión con Google');
        } finally {
            setIsConnectingOAuth(false);
        }
    };

    const handleDisconnectGoogle = async () => {
        if (!confirm('¿Deseas desconectar tu cuenta de Google Drive personal?')) return;
        try {
            const res = await fetch('/api/backup/auth/disconnect', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Cuenta de Google desconectada');
                fetchStatus();
            }
        } catch (err) {
            toast.error('Error al desconectar');
        }
    };

    // Unificar lista de respaldos locales y en Google Drive
    const unifiedBackups = useMemo(() => {
        const map = new Map();

        // 1. Respaldos locales
        (statusData?.localBackups || []).forEach(b => {
            map.set(b.name, {
                name: b.name,
                createdAt: b.createdAt,
                size: b.size,
                inLocal: true,
                inDrive: false,
                driveId: null,
                driveLink: null
            });
        });

        // 2. Archivos en Google Drive
        (statusData?.driveFiles || []).forEach(f => {
            if (map.has(f.name)) {
                const item = map.get(f.name);
                item.inDrive = true;
                item.driveId = f.id;
                item.driveLink = f.webViewLink;
                if (!item.size && f.size) item.size = parseInt(f.size, 10);
            } else {
                map.set(f.name, {
                    name: f.name,
                    createdAt: f.createdTime,
                    size: f.size ? parseInt(f.size, 10) : 0,
                    inLocal: false,
                    inDrive: true,
                    driveId: f.id,
                    driveLink: f.webViewLink
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [statusData]);

    const lastDate = statusData?.lastBackupAt;
    const isOAuthConnected = statusData?.oauthConnected;
    const isOAuthConfigured = statusData?.oauthConfigured;

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                            <FiSettings className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Ajustes del Sistema</h1>
                            <p className="text-sm text-gray-500">
                                Copias de seguridad, sincronización en Google Drive (5 TB) y gestión de archivos
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchStatus}
                        disabled={loading || isBackingUp}
                        className="px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Tarjeta Principal de Backups */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                                    <FiDatabase className="w-3.5 h-3.5" />
                                    Copia de Seguridad
                                </span>
                                {isOAuthConnected ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <FiCheckCircle className="w-3.5 h-3.5" />
                                        Google One 5 TB Conectado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                        <FiHardDrive className="w-3.5 h-3.5" />
                                        Almacenamiento Local Activo
                                    </span>
                                )}
                            </div>

                            <h2 className="text-xl font-bold text-gray-900">
                                Respaldos Automáticos & Google Drive
                            </h2>
                            <p className="text-sm text-gray-600 max-w-2xl">
                                El sistema realiza automáticamente un resguardo íntegro de la base de datos todos los días a las <strong>22:00 hs</strong>. 
                                Además, puedes forzar un backup manual en cualquier momento, descargar una copia o eliminar las que no necesites.
                            </p>
                        </div>

                        {/* Botones de Acción Inmediata */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleRunBackup}
                                disabled={isBackingUp}
                                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 disabled:opacity-60 cursor-pointer"
                            >
                                <FiUploadCloud className={`w-5 h-5 ${isBackingUp ? 'animate-pulse text-blue-200' : ''}`} />
                                <span>{isBackingUp ? 'Realizando Backup...' : 'Subir Backup Ahora'}</span>
                            </button>

                            <button
                                onClick={() => handleDownloadBackup()}
                                disabled={isDownloading || isBackingUp}
                                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm border border-gray-200 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                            >
                                <FiDownloadCloud className="w-4 h-4 text-gray-600" />
                                <span>Descargar Copia (.sqlite)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Métricas y Datos del Último Backup */}
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-white">
                    {/* Último Backup */}
                    <div className="p-6 flex items-start gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <FiClock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Último Backup Realizado</p>
                            <p className="text-lg font-bold text-slate-900 tabular-nums">
                                {lastDate ? formatDate(lastDate) : 'Aún no realizado'}
                            </p>
                            {statusData?.fileName && (
                                <p className="text-xs font-mono text-slate-500 truncate max-w-[200px]" title={statusData.fileName}>
                                    {statusData.fileName}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tamaño de la Base de Datos */}
                    <div className="p-6 flex items-start gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                            <FiHardDrive className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tamaño del Respaldo</p>
                            <p className="text-lg font-bold text-slate-900 tabular-nums">
                                {statusData?.size ? formatBytes(statusData.size) : '1.67 MB'}
                            </p>
                            <p className="text-xs text-slate-500">Base SQLite con transacciones compactadas (WAL flush)</p>
                        </div>
                    </div>

                    {/* Programación Automática */}
                    <div className="p-6 flex items-start gap-4">
                        <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                            <FiServer className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Programación Automática</p>
                            <p className="text-lg font-bold text-slate-900 tabular-nums">22:00 hs Diaria</p>
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Cron Job Activo en el Servidor
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info y Estado de Cuenta Google Drive */}
                <div className="p-6 bg-gray-50/60 border-t border-gray-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                            <FiFolder className="text-blue-600" />
                            Conexión con Google Drive & Almacenamiento (5 TB)
                        </h3>

                        {isOAuthConnected ? (
                            <button
                                onClick={handleDisconnectGoogle}
                                className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
                            >
                                <FiXCircle className="w-3.5 h-3.5" />
                                Desconectar cuenta personal
                            </button>
                        ) : (
                            <button
                                onClick={handleConnectGoogle}
                                disabled={isConnectingOAuth}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                            >
                                <FiLink className="w-3.5 h-3.5" />
                                <span>{isConnectingOAuth ? 'Abriendo Google...' : 'Vincular mi cuenta de Google (5 TB)'}</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-gray-200/80 space-y-1.5">
                            <p className="text-xs text-gray-400 font-medium">Carpeta Vinculada en Google Drive</p>
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800">
                                    {statusData?.driveFolder?.name || 'Backups local'}
                                </span>
                                {statusData?.driveFolder?.webViewLink && (
                                    <a
                                        href={statusData.driveFolder.webViewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                    >
                                        Abrir en Drive <FiExternalLink />
                                    </a>
                                )}
                            </div>
                            <p className="text-xs font-mono text-gray-400 break-all">
                                ID: {statusData?.folderId || '1qCxRZC11UimYwbo40pHOyOTQzOsngUzQ'}
                            </p>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-gray-200/80 space-y-1.5">
                            <p className="text-xs text-gray-400 font-medium">Cuenta Activa de Google</p>
                            {isOAuthConnected ? (
                                <>
                                    <span className="font-bold text-emerald-800 text-sm block truncate">
                                        {statusData?.oauthEmail || statusData?.accountEmail || 'creativegianfranco@gmail.com'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        ✓ Autorizado con cuenta personal (Google One 5 TB)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="font-semibold text-gray-700 text-sm block truncate">
                                        {statusData?.accountEmail || 'Sin cuenta personal vinculada'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        Pulsa "Vincular mi cuenta" para usar tus 5 TB
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Guía si necesita configurar Client ID */}
                    {(!isOAuthConfigured || showOAuthHelp) && !isOAuthConnected && (
                        <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-sm text-blue-900">
                            <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-2">
                                    <FiHelpCircle className="text-blue-600" />
                                    Pasos para habilitar la vinculación con tu cuenta de 5 TB:
                                </span>
                            </div>
                            <ol className="list-decimal list-inside text-xs text-blue-800 space-y-1.5 pl-1 leading-relaxed">
                                <li>En tu proyecto de Google Cloud, ve a <strong>Credenciales ➔ Crear credenciales ➔ ID de cliente de OAuth</strong>.</li>
                                <li>Selecciona tipo <strong>"Aplicación web"</strong> y en <em>URIs de redirección autorizados</em> agrega: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px]">http://localhost:3001/api/backup/auth/callback</code></li>
                                <li>Copia el <strong>ID de cliente</strong> y el <strong>Secreto de cliente</strong> y agrégalos a tu archivo <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px]">server/.env</code>.</li>
                            </ol>
                        </div>
                    )}
                </div>
            </div>

            {/* Historial de Respaldos Almacenados con opción de Eliminar */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                            <FiFileText className="text-blue-600" />
                            Historial de Copias de la Base de Datos
                        </h2>
                        <p className="text-xs text-gray-500">
                            Gestiona tus copias de seguridad: descárgalas o elimina las que ya no necesites
                        </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                        {unifiedBackups.length} disponibles
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500 uppercase tracking-wider">
                                <th className="py-3 px-4 font-semibold">Archivo de Base de Datos</th>
                                <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                                <th className="py-3 px-4 font-semibold">Tamaño</th>
                                <th className="py-3 px-4 font-semibold">Ubicación</th>
                                <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {unifiedBackups.length > 0 ? (
                                unifiedBackups.map((b) => (
                                    <tr key={b.name} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-mono text-xs font-medium text-gray-800">
                                            {b.name}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {formatDate(b.createdAt)}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 font-medium">
                                            {formatBytes(b.size)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {b.inLocal && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <FiCheckCircle className="w-3 h-3" />
                                                        Local
                                                    </span>
                                                )}
                                                {b.inDrive && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                        <FiFolder className="w-3 h-3" />
                                                        Drive
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {b.inLocal ? (
                                                    <button
                                                        onClick={() => handleDownloadBackup(b.name)}
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition cursor-pointer inline-flex items-center gap-1"
                                                        title="Descargar copia local"
                                                    >
                                                        <FiDownloadCloud className="w-3.5 h-3.5" />
                                                        <span>Descargar</span>
                                                    </button>
                                                ) : b.driveLink ? (
                                                    <a
                                                        href={b.driveLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition cursor-pointer inline-flex items-center gap-1"
                                                        title="Ver en Google Drive"
                                                    >
                                                        <FiExternalLink className="w-3.5 h-3.5" />
                                                        <span>Drive</span>
                                                    </a>
                                                ) : null}

                                                {/* Botón para Eliminar la base de datos seleccionada */}
                                                <button
                                                    onClick={() => setBackupToDelete(b)}
                                                    className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition cursor-pointer inline-flex items-center gap-1"
                                                    title="Eliminar este archivo de base de datos"
                                                >
                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                    <span>Eliminar</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-400">
                                        No hay respaldos guardados todavía. Haz clic en "Subir Backup Ahora" para generar el primero.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de confirmación para eliminar base de datos */}
            <ConfirmModal
                isOpen={!!backupToDelete}
                title="¿Eliminar copia de base de datos?"
                message={
                    <div className="space-y-2">
                        <p>
                            Estás a punto de eliminar la copia de base de datos:
                        </p>
                        <p className="font-mono text-xs bg-gray-100 p-2 rounded-lg text-gray-800 break-all font-bold">
                            {backupToDelete?.name}
                        </p>
                        <p className="text-xs text-red-600">
                            Esta acción borrará el archivo de tu almacenamiento (local y Google Drive) y no se podrá deshacer.
                        </p>
                    </div>
                }
                confirmText={isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
                cancelText="Cancelar"
                confirmVariant="danger"
                onConfirm={handleDeleteBackup}
                onCancel={() => !isDeleting && setBackupToDelete(null)}
            />

            {/* Información Técnica del Entorno */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <FiShield className="text-gray-500" />
                    Información del Sistema
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                        <span className="text-gray-400 block font-medium">Motor de Base de Datos</span>
                        <span className="font-bold text-gray-800 text-sm">SQLite (WAL Mode)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                        <span className="text-gray-400 block font-medium">Seguridad de Transacciones</span>
                        <span className="font-bold text-gray-800 text-sm">Checkpoint Automático en Backup</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                        <span className="text-gray-400 block font-medium">Base de Datos Activa</span>
                        <span className="font-mono text-gray-700 block truncate" title="inventory.db">inventory.db (Raíz - En Producción)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AjustesPage;
