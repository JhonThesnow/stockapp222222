const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cron = require('node-cron');
const { google } = require('googleapis');

const STATUS_FILE = path.resolve(__dirname, '../backup_status.json');
const OAUTH_TOKENS_FILE = path.resolve(__dirname, '../oauth_tokens.json');
const BACKUPS_DIR = path.resolve(__dirname, '../../backups');

/**
 * Asegura que exista el directorio local para backups
 */
const ensureBackupsDir = () => {
    if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    return BACKUPS_DIR;
};

/**
 * Fuerza el vaciado de las transacciones WAL hacia el archivo principal de la base de datos
 */
const checkpointWal = async () => {
    try {
        const prisma = require('../prismaClient');
        await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
        console.log('[BackupService] WAL checkpoint (TRUNCATE) ejecutado con éxito vía Prisma.');
    } catch (e) {
        console.warn('[BackupService] Aviso en WAL checkpoint:', e.message);
    }
};

/**
 * Detecta la ruta real del archivo SQLite activo (priorizando la configurada en Prisma)
 */
const getRealDatabasePath = () => {
    if (process.env.DATABASE_URL) {
        const clean = process.env.DATABASE_URL.replace(/^file:/, '').replace(/^\/\//, '');
        const prismaResolved = path.resolve(__dirname, '../prisma', clean);
        if (fs.existsSync(prismaResolved) && fs.statSync(prismaResolved).isFile()) {
            return prismaResolved;
        }
    }

    const serverDbPath = path.resolve(__dirname, '../inventory.db');
    if (fs.existsSync(serverDbPath) && fs.statSync(serverDbPath).isFile()) {
        return serverDbPath;
    }

    const candidates = [
        path.resolve(__dirname, '../../inventory.db'),
        path.resolve(process.cwd(), 'inventory.db'),
        path.resolve(process.cwd(), 'server/inventory.db')
    ];

    const validFiles = [];
    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
            try {
                const stat = fs.statSync(filePath);
                if (stat.isFile()) {
                    validFiles.push({ path: filePath, size: stat.size, mtime: stat.mtimeMs });
                }
            } catch (e) {
                // ignorar errores
            }
        }
    }

    if (validFiles.length === 0) {
        throw new Error('No se encontró ningún archivo de base de datos SQLite (.db)');
    }

    validFiles.sort((a, b) => b.mtime - a.mtime || b.size - a.size);
    return validFiles[0].path;
};

/**
 * Métodos de gestión de tokens OAuth 2.0
 */
const readOAuthTokens = () => {
    try {
        if (fs.existsSync(OAUTH_TOKENS_FILE)) {
            return JSON.parse(fs.readFileSync(OAUTH_TOKENS_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('[BackupService] Error al leer tokens OAuth:', e.message);
    }
    return null;
};

const saveOAuthTokens = (tokens) => {
    try {
        const current = readOAuthTokens() || {};
        const updated = { ...current, ...tokens, updatedAt: new Date().toISOString() };
        fs.writeFileSync(OAUTH_TOKENS_FILE, JSON.stringify(updated, null, 2), 'utf8');
        return updated;
    } catch (e) {
        console.error('[BackupService] Error al guardar tokens OAuth:', e.message);
        throw e;
    }
};

const clearOAuthTokens = () => {
    try {
        if (fs.existsSync(OAUTH_TOKENS_FILE)) {
            fs.unlinkSync(OAUTH_TOKENS_FILE);
        }
    } catch (e) {
        console.warn('[BackupService] Error al eliminar tokens OAuth:', e.message);
    }
};

const getOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/backup/auth/callback';

    if (!clientId || !clientSecret) {
        return null;
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Obtiene el cliente autenticado de Google Drive.
 * Prioridad 1: OAuth 2.0 (Cuenta Personal del usuario con 5 TB)
 * Prioridad 2: Service Account (Robot)
 */
const getDriveClient = () => {
    const oauthTokens = readOAuthTokens();
    const oauthClient = getOAuth2Client();

    // 1. Si hay OAuth2 configurado con refresh_token
    if (oauthClient && oauthTokens && oauthTokens.refresh_token) {
        oauthClient.setCredentials(oauthTokens);
        // Manejar actualización automática de token
        oauthClient.on('tokens', (newTokens) => {
            saveOAuthTokens(newTokens);
        });

        return {
            drive: google.drive({ version: 'v3', auth: oauthClient }),
            authType: 'oauth',
            clientEmail: oauthTokens.email || 'Cuenta Personal (Google One 5TB)'
        };
    }

    // 2. Si no hay OAuth, usar Service Account
    let credentials = null;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
            console.error('[BackupService] Error al parsear GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
        }
    }

    const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials && credPath) {
        const candidatePaths = [
            credPath,
            path.resolve(__dirname, '..', credPath),
            path.resolve(__dirname, '../..', credPath),
            path.resolve(process.cwd(), credPath)
        ];

        for (const cp of candidatePaths) {
            if (fs.existsSync(cp)) {
                try {
                    credentials = JSON.parse(fs.readFileSync(cp, 'utf8'));
                    break;
                } catch (e) {
                    console.error('[BackupService] Error al leer credenciales:', e.message);
                }
            }
        }
    }

    if (credentials) {
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
        });
        return {
            drive: google.drive({ version: 'v3', auth }),
            authType: 'service_account',
            clientEmail: credentials.client_email
        };
    }

    throw new Error('No hay credenciales configuradas de Google Drive (ni OAuth2 ni Service Account)');
};

/**
 * Realiza una copia local segura del archivo SQLite actual.
 */
const createLocalBackupCopy = async () => {
    await checkpointWal();

    const sourcePath = getRealDatabasePath();
    const backupDir = ensureBackupsDir();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupFileName = `backup_stock_${timestamp}.sqlite`;
    const destinationPath = path.join(backupDir, backupFileName);

    fs.copyFileSync(sourcePath, destinationPath);
    const stat = fs.statSync(destinationPath);

    // Mantener los últimos 30 backups locales
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_stock_') && f.endsWith('.sqlite'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 30) {
            for (let i = 30; i < files.length; i++) {
                try {
                    fs.unlinkSync(path.join(backupDir, files[i].name));
                } catch (e) {
                    // ignorar
                }
            }
        }
    } catch (e) {
        // ignorar
    }

    return {
        filePath: destinationPath,
        fileName: backupFileName,
        sourcePath,
        size: stat.size,
        createdAt: now.toISOString()
    };
};

/**
 * Sube el archivo a Google Drive
 */
const uploadBackupToDrive = async (filePath, fileName) => {
    const { drive, authType, clientEmail } = getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const fileMetadata = {
        name: fileName,
        ...(folderId ? { parents: [folderId] } : {})
    };

    const media = {
        mimeType: 'application/x-sqlite3',
        body: fs.createReadStream(filePath)
    };

    console.log(`[BackupService] Subiendo ${fileName} vía ${authType} (${clientEmail}) a carpeta: ${folderId || 'Raíz'}...`);
    const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        supportsAllDrives: true,
        fields: 'id, name, webViewLink, size, createdTime'
    });

    return res.data;
};

/**
 * Lee el estado persistido
 */
const readStoredStatus = () => {
    try {
        if (fs.existsSync(STATUS_FILE)) {
            return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('[BackupService] Error al leer status file:', e.message);
    }
    return null;
};

/**
 * Guarda el estado en archivo
 */
const saveStoredStatus = (statusData) => {
    try {
        fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');
    } catch (e) {
        console.error('[BackupService] Error al guardar status file:', e.message);
    }
};

/**
 * Lista los backups locales disponibles
 */
const getLocalBackupsList = () => {
    const backupDir = ensureBackupsDir();
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_stock_') && f.endsWith('.sqlite'))
            .map(f => {
                const fullPath = path.join(backupDir, f);
                const stat = fs.statSync(fullPath);
                return {
                    name: f,
                    size: stat.size,
                    createdAt: stat.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return files;
    } catch (e) {
        return [];
    }
};

/**
 * Proceso integral de backup
 */
const performBackup = async () => {
    let localBackup = null;
    let driveResult = null;
    let driveError = null;

    try {
        console.log('[BackupService] Iniciando generación de backup...');
        localBackup = await createLocalBackupCopy();
        console.log(`[BackupService] Respaldo local generado: ${localBackup.fileName} (${(localBackup.size / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (error) {
        console.error('[BackupService] Error generando copia local:', error.message);
        const failStatus = {
            success: false,
            status: 'error',
            lastBackupAt: readStoredStatus()?.lastBackupAt || null,
            lastAttemptAt: new Date().toISOString(),
            error: `Error al copiar la base de datos: ${error.message}`
        };
        saveStoredStatus(failStatus);
        return failStatus;
    }

    try {
        console.log('[BackupService] Intentando subida a Google Drive...');
        const driveData = await uploadBackupToDrive(localBackup.filePath, localBackup.fileName);
        driveResult = {
            id: driveData.id,
            name: driveData.name,
            link: driveData.webViewLink,
            size: driveData.size
        };
        console.log(`[BackupService] ¡Backup subido a Google Drive exitosamente! ID: ${driveData.id}`);
    } catch (error) {
        console.error('[BackupService] Error subiendo a Google Drive:', error.message);
        driveError = error.message;
    }

    const isDriveQuotaIssue = driveError && driveError.includes('Service Accounts do not have storage quota');

    const statusResult = {
        success: true,
        status: driveResult ? 'success' : 'local_only',
        lastBackupAt: localBackup.createdAt,
        fileName: localBackup.fileName,
        size: localBackup.size,
        localSaved: true,
        driveSynced: !!driveResult,
        driveFileId: driveResult?.id || null,
        driveLink: driveResult?.link || null,
        driveError: driveError ? (
            isDriveQuotaIssue
                ? 'La cuenta de servicio robot no tiene cuota en carpetas personales. Conecta tu cuenta de Google One con OAuth para usar tus 5 TB.'
                : driveError
        ) : null
    };

    saveStoredStatus(statusResult);
    return statusResult;
};

/**
 * Consulta el estado del sistema y la conexión con Drive
 */
const getBackupStatus = async () => {
    const localStatus = readStoredStatus() || {
        lastBackupAt: null,
        status: 'idle',
        fileName: null,
        error: null
    };

    const localBackups = getLocalBackupsList();
    if (localBackups.length > 0 && !localStatus.lastBackupAt) {
        localStatus.lastBackupAt = localBackups[0].createdAt;
        localStatus.fileName = localBackups[0].name;
        localStatus.size = localBackups[0].size;
        localStatus.status = 'local_only';
    }

    let driveFiles = [];
    let driveConnected = false;
    let driveFolder = null;
    let authType = 'none';
    let accountEmail = null;

    const oauthTokens = readOAuthTokens();
    const oauthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const oauthConnected = !!(oauthTokens && oauthTokens.refresh_token);

    try {
        const driveInfo = getDriveClient();
        authType = driveInfo.authType;
        accountEmail = driveInfo.clientEmail;
        const drive = driveInfo.drive;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (folderId) {
            try {
                const folderRes = await drive.files.get({
                    fileId: folderId,
                    fields: 'id, name, webViewLink'
                });
                driveFolder = folderRes.data;
                driveConnected = true;
            } catch (e) {
                console.warn('[BackupService] Error al consultar carpeta Drive:', e.message);
            }

            try {
                const listRes = await drive.files.list({
                    q: `'${folderId}' in parents and trashed = false`,
                    orderBy: 'createdTime desc',
                    pageSize: 10,
                    fields: 'files(id, name, createdTime, size, webViewLink)'
                });
                driveFiles = listRes.data.files || [];
            } catch (e) {
                // ignorar
            }
        }
    } catch (err) {
        localStatus.credentialsError = err.message;
    }

    return {
        ...localStatus,
        driveConnected,
        driveFolder,
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
        authType,
        accountEmail,
        oauthConfigured,
        oauthConnected,
        oauthEmail: oauthTokens?.email || null,
        localBackups,
        driveFiles,
        scheduler: {
            enabled: true,
            cron: process.env.BACKUP_CRON_SCHEDULE || '0 22 * * *',
            scheduleDescription: 'Todos los días a las 22:00 hs'
        }
    };
};

/**
 * Inicializador del cron job
 */
const initBackupScheduler = () => {
    const scheduleExpression = process.env.BACKUP_CRON_SCHEDULE || '0 22 * * *';
    console.log(`[BackupService] Programador de backup inicializado con patrón: "${scheduleExpression}" (22:00 hrs)`);

    cron.schedule(scheduleExpression, async () => {
        console.log('[BackupService] Ejecutando backup automático diario...');
        await performBackup();
    });
};

/**
 * Elimina un archivo de backup de la carpeta local y/o de Google Drive
 */
const deleteBackupFile = async (fileName, driveFileId) => {
    let deletedLocal = false;
    let deletedDrive = false;
    const errors = [];

    // 1. Eliminar localmente de /backups/
    if (fileName) {
        const cleanName = path.basename(fileName);
        const localPath = path.join(BACKUPS_DIR, cleanName);
        if (fs.existsSync(localPath)) {
            try {
                fs.unlinkSync(localPath);
                deletedLocal = true;
                console.log(`[BackupService] Backup local eliminado: ${cleanName}`);
            } catch (e) {
                errors.push(`Error local: ${e.message}`);
            }
        }
    }

    // 2. Eliminar de Google Drive si existe
    try {
        const driveInfo = getDriveClient();
        if (driveInfo && driveInfo.drive) {
            const drive = driveInfo.drive;
            let targetDriveId = driveFileId;

            if (!targetDriveId && fileName && process.env.GOOGLE_DRIVE_FOLDER_ID) {
                const cleanName = path.basename(fileName);
                const listRes = await drive.files.list({
                    q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and name = '${cleanName}' and trashed = false`,
                    fields: 'files(id, name)'
                });
                if (listRes.data.files && listRes.data.files.length > 0) {
                    targetDriveId = listRes.data.files[0].id;
                }
            }

            if (targetDriveId) {
                await drive.files.delete({ fileId: targetDriveId, supportsAllDrives: true });
                deletedDrive = true;
                console.log(`[BackupService] Backup eliminado de Google Drive: ${targetDriveId}`);
            }
        }
    } catch (e) {
        console.warn('[BackupService] Aviso eliminando de Drive:', e.message);
    }

    // 3. Actualizar backup_status.json si el archivo eliminado era el último registrado
    const currentStatus = readStoredStatus();
    if (currentStatus && currentStatus.fileName === fileName) {
        const remaining = getLocalBackupsList();
        if (remaining.length > 0) {
            saveStoredStatus({
                ...currentStatus,
                fileName: remaining[0].name,
                lastBackupAt: remaining[0].createdAt,
                size: remaining[0].size
            });
        } else {
            saveStoredStatus({
                ...currentStatus,
                fileName: null,
                lastBackupAt: null,
                size: 0
            });
        }
    }

    return {
        success: deletedLocal || deletedDrive,
        deletedLocal,
        deletedDrive,
        errors
    };
};

module.exports = {
    createLocalBackupCopy,
    uploadBackupToDrive,
    performBackup,
    getBackupStatus,
    getRealDatabasePath,
    getLocalBackupsList,
    initBackupScheduler,
    getOAuth2Client,
    readOAuthTokens,
    saveOAuthTokens,
    clearOAuthTokens,
    deleteBackupFile,
    BACKUPS_DIR
};
