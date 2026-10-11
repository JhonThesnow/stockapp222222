const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { google } = require('googleapis');

/**
 * Realiza una copia segura del archivo SQLite actual.
 * Detecta si existe inventory.db o database.sqlite en el directorio server.
 */
const copyDatabaseSafely = (tempDir) => {
    const serverDir = path.resolve(__dirname, '..');
    const possibleFiles = ['inventory.db', 'database.sqlite', 'database.db'];
    let sourcePath = null;

    for (const file of possibleFiles) {
        const fullPath = path.join(serverDir, file);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.size > 0) {
                sourcePath = fullPath;
                break;
            }
        }
    }

    if (!sourcePath) {
        // Fallback al primer archivo existente
        for (const file of possibleFiles) {
            const fullPath = path.join(serverDir, file);
            if (fs.existsSync(fullPath)) {
                sourcePath = fullPath;
                break;
            }
        }
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
        throw new Error(`No se encontró ningún archivo de base de datos SQLite en: ${serverDir}`);
    }

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const backupFileName = `backup_stock_${timestamp}.sqlite`;
    const destinationPath = path.join(tempDir, backupFileName);

    // Copia segura
    fs.copyFileSync(sourcePath, destinationPath);

    return {
        filePath: destinationPath,
        fileName: backupFileName,
        sourcePath
    };
};

/**
 * Obtiene el cliente autenticado de Google Drive usando Service Account
 */
const getDriveClient = () => {
    let credentials = null;

    // 1. Intentar desde variable GOOGLE_SERVICE_ACCOUNT_JSON (JSON string)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
            console.error('[BackupService] Error al parsear GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
        }
    }

    // 2. Intentar desde ruta en GOOGLE_SERVICE_ACCOUNT_PATH o GOOGLE_APPLICATION_CREDENTIALS
    const credPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credentials && credPath && fs.existsSync(credPath)) {
        try {
            credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        } catch (e) {
            console.error('[BackupService] Error al leer credenciales desde archivo:', e.message);
        }
    }

    if (!credentials) {
        throw new Error(
            'Credenciales de Google Service Account no configuradas. Defina GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_SERVICE_ACCOUNT_PATH en .env'
        );
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    return google.drive({ version: 'v3', auth });
};

/**
 * Sube el archivo de backup a Google Drive
 */
const uploadBackupToDrive = async (filePath, fileName) => {
    const drive = getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const fileMetadata = {
        name: fileName,
        ...(folderId ? { parents: [folderId] } : {})
    };

    const media = {
        mimeType: 'application/x-sqlite3',
        body: fs.createReadStream(filePath)
    };

    console.log(`[BackupService] Subiendo ${fileName} a Google Drive...`);
    const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size'
    });

    return res.data;
};

/**
 * Ejecuta el proceso completo de respaldo:
 * 1. Copia segura de la base de datos
 * 2. Autenticación y subida a Google Drive
 * 3. Limpieza del archivo temporal
 */
const performBackup = async () => {
    const tempDir = path.resolve(__dirname, '../../backups_temp');
    let backupInfo = null;

    try {
        console.log('[BackupService] Iniciando backup automático...');
        backupInfo = copyDatabaseSafely(tempDir);
        console.log(`[BackupService] Copia creada en: ${backupInfo.filePath}`);

        const driveResponse = await uploadBackupToDrive(backupInfo.filePath, backupInfo.fileName);
        console.log(`[BackupService] ¡Backup subido con éxito! ID en Drive: ${driveResponse.id} (${driveResponse.name})`);

        return {
            success: true,
            fileName: backupInfo.fileName,
            driveFileId: driveResponse.id,
            driveLink: driveResponse.webViewLink
        };
    } catch (error) {
        console.error('[BackupService] Error durante el proceso de backup:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (backupInfo && fs.existsSync(backupInfo.filePath)) {
            try {
                fs.unlinkSync(backupInfo.filePath);
            } catch (e) {
                // ignorar error de limpieza
            }
        }
    }
};

/**
 * Inicializa el cron job a las 22:00 todos los días
 */
const initBackupScheduler = () => {
    // Expresión cron: '0 22 * * *' (a las 22:00:00 todos los días)
    const scheduleExpression = process.env.BACKUP_CRON_SCHEDULE || '0 22 * * *';

    console.log(`[BackupService] Programador de backup inicializado con patrón: "${scheduleExpression}" (22:00 hrs)`);

    cron.schedule(scheduleExpression, async () => {
        console.log('[BackupService] Disparando tarea cron programada...');
        await performBackup();
    });
};

module.exports = {
    copyDatabaseSafely,
    uploadBackupToDrive,
    performBackup,
    initBackupScheduler
};
