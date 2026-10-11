const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const { authenticateToken } = require('../middlewares/auth');
const { 
    performBackup, 
    getBackupStatus, 
    createLocalBackupCopy,
    getOAuth2Client,
    saveOAuthTokens,
    clearOAuthTokens,
    deleteBackupFile,
    BACKUPS_DIR
} = require('../services/backupService');

// Obtener estado actual del backup, fecha del último backup y lista de respaldos
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = await getBackupStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        console.error('[BackupRoute] Error al consultar status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// URL de autorización OAuth 2.0 para conectar cuenta de Google personal (5TB)
router.get('/auth/url', authenticateToken, (req, res) => {
    try {
        const oauthClient = getOAuth2Client();
        if (!oauthClient) {
            return res.status(400).json({ 
                success: false, 
                error: 'Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en server/.env' 
            });
        }

        const returnTo = req.query.returnTo || req.headers.referer || '/ajustes';

        const url = oauthClient.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            state: returnTo,
            scope: [
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/userinfo.email'
            ]
        });

        res.json({ success: true, url });
    } catch (error) {
        console.error('[BackupRoute] Error generando URL de autenticación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Callback al que redirige Google luego de autorizar la cuenta
router.get('/auth/callback', async (req, res) => {
    const { code, error, state } = req.query;

    const getRedirectUrl = (paramName, paramVal) => {
        let base = state || '/ajustes';
        const separator = base.includes('?') ? '&' : '?';
        return `${base}${separator}${paramName}=${encodeURIComponent(paramVal)}`;
    };

    if (error) {
        console.error('[BackupRoute] Error retornado por Google OAuth:', error);
        return res.redirect(getRedirectUrl('oauth_error', error));
    }

    if (!code) {
        return res.redirect(getRedirectUrl('oauth_error', 'no_code'));
    }

    try {
        const oauthClient = getOAuth2Client();
        if (!oauthClient) {
            return res.redirect(getRedirectUrl('oauth_error', 'not_configured'));
        }

        const { tokens } = await oauthClient.getToken(code);
        oauthClient.setCredentials(tokens);

        // Obtener el correo del usuario que autorizó
        let userEmail = null;
        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
            const userInfo = await oauth2.userinfo.get();
            userEmail = userInfo.data.email;
        } catch (e) {
            console.warn('[BackupRoute] No se pudo obtener userinfo:', e.message);
        }

        saveOAuthTokens({
            ...tokens,
            email: userEmail
        });

        console.log(`[BackupRoute] ¡Cuenta Google OAuth vinculada exitosamente! Correo: ${userEmail}`);
        res.redirect(getRedirectUrl('oauth_success', 'true'));
    } catch (err) {
        console.error('[BackupRoute] Error intercambiando código OAuth:', err);
        res.redirect(getRedirectUrl('oauth_error', err.message));
    }
});

// Desconectar cuenta de Google personal
router.post('/auth/disconnect', authenticateToken, (req, res) => {
    try {
        clearOAuthTokens();
        res.json({ success: true, message: 'Cuenta de Google desconectada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Disparar backup manual inmediatamente
router.post('/run', authenticateToken, async (req, res) => {
    try {
        console.log(`[BackupRoute] Solicitud de backup manual iniciada por: ${req.user?.username || 'admin'}`);
        const result = await performBackup();
        if (result.success) {
            res.json({ 
                success: true, 
                message: result.driveSynced 
                    ? '¡Backup completado y subido a tu Google Drive (5TB) exitosamente!'
                    : 'Backup guardado localmente de forma segura' + (result.driveError ? ` (${result.driveError})` : ''), 
                data: result 
            });
        } else {
            res.status(500).json({ success: false, error: result.error || 'Error al realizar backup' });
        }
    } catch (error) {
        console.error('[BackupRoute] Error ejecutando backup manual:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Descargar un archivo específico de backup por nombre
router.get('/download/:fileName', authenticateToken, (req, res) => {
    try {
        const fileName = path.basename(req.params.fileName);
        const filePath = path.join(BACKUPS_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Archivo de backup no encontrado' });
        }

        res.download(filePath, fileName);
    } catch (error) {
        console.error('[BackupRoute] Error descargando archivo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Descargar snapshot fresco instantáneo
router.get('/download', authenticateToken, async (req, res) => {
    try {
        const copyResult = await createLocalBackupCopy();
        res.download(copyResult.filePath, copyResult.fileName);
    } catch (error) {
        console.error('[BackupRoute] Error preparando descarga:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Eliminar un archivo de backup (local y/o de Google Drive)
router.delete('/:fileName', authenticateToken, async (req, res) => {
    try {
        const fileName = req.params.fileName;
        const driveFileId = req.query.driveFileId;
        console.log(`[BackupRoute] Solicitud de eliminación de backup: ${fileName} (Drive ID: ${driveFileId || 'auto'}) por usuario: ${req.user?.username || 'admin'}`);
        
        const result = await deleteBackupFile(fileName, driveFileId);
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Copia de seguridad eliminada con éxito',
                result 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: result.errors.length > 0 ? result.errors.join(', ') : 'Archivo de backup no encontrado o ya eliminado' 
            });
        }
    } catch (error) {
        console.error('[BackupRoute] Error eliminando backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
