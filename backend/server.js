const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración GitHub
const GITHUB_CONFIG = {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    filePath: 'data/staff.json'
};

// Verificar configuración
if (!GITHUB_CONFIG.token || !GITHUB_CONFIG.owner || !GITHUB_CONFIG.repo) {
    console.error('❌ ERROR: Configura GitHub en el archivo .env');
    process.exit(1);
}

// Clave para operaciones administrativas
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// =============================
// FUNCIONES GITHUB
// =============================

async function getGitHubFile() {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        // Decodificar contenido base64
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return {
            data: JSON.parse(content),
            sha: response.data.sha
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Archivo no existe, crear uno por defecto
            return await createInitialFile();
        }
        throw error;
    }
}

async function updateGitHubFile(data, sha = null) {
    try {
        const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}`;
        
        // Obtener datos existentes para fusionar
        let existingData = { staff: [], usuarios: [], config: {} };
        if (sha) {
            try {
                const existing = await getGitHubFile();
                existingData = existing.data;
            } catch (error) {
                // Si hay error, continuar con datos nuevos
                console.log('⚠️ No se pudieron obtener datos existentes, creando nuevo archivo');
            }
        }
        
        // Fusionar datos: mantener lo existente y añadir/actualizar lo nuevo
        const mergedData = {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            staff: mergeArraysById(existingData.staff || [], data.staff || []),
            usuarios: mergeArraysByUsername(existingData.usuarios || [], data.usuarios || []),
            config: { ...existingData.config, ...data.config }
        };
        
        const content = Buffer.from(JSON.stringify(mergedData, null, 2)).toString('base64');
        
        const payload = {
            message: `Actualización desde MineGhost - ${new Date().toLocaleString('es-ES')}`,
            content: content
        };

        if (sha) {
            payload.sha = sha;
        }

        const response = await axios.put(url, payload, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        });

        return {
            success: true,
            sha: response.data.content.sha,
            url: response.data.content.download_url,
            data: mergedData
        };
    } catch (error) {
        console.error('Error actualizando GitHub:', error.response?.data || error.message);
        throw error;
    }
}

// Funciones auxiliares para fusionar arrays
function mergeArraysById(existingArray, newArray) {
    const result = [...existingArray];
    
    newArray.forEach(newItem => {
        const index = result.findIndex(item => item.id === newItem.id);
        if (index >= 0) {
            // Actualizar existente
            result[index] = { ...result[index], ...newItem };
        } else {
            // Agregar nuevo
            result.push(newItem);
        }
    });
    
    return result.sort((a, b) => a.id - b.id);
}

function mergeArraysByUsername(existingArray, newArray) {
    const result = [...existingArray];
    
    newArray.forEach(newItem => {
        const index = result.findIndex(item => item.username === newItem.username);
        if (index >= 0) {
            // Actualizar existente
            result[index] = { ...result[index], ...newItem };
        } else {
            // Agregar nuevo
            result.push(newItem);
        }
    });
    
    return result;
}

async function createInitialFile() {
    const initialData = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        staff: [
            {
                id: 1,
                nombre: "Admin",
                usuario: "admin#0001",
                rango: "Owner",
                premium: "Sí",
                invitadoPor: "Sistema",
                fecha: new Date().toLocaleString('es-ES')
            }
        ],
        usuarios: [
            { id: 1, username: "admin", password: "admin123" }
        ],
        config: {
            adminPassword: "admin123",
            totalMembers: 1
        }
    };

    await updateGitHubFile(initialData);
    
    return {
        data: initialData,
        sha: null
    };
}

// =============================
// MIDDLEWARE DE AUTENTICACIÓN
// =============================

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    
    if (token !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Token inválido' });
    }

    next();
}

// =============================
// RUTAS DE LA API
// =============================

// Obtener datos (público)
app.get('/api/data', async (req, res) => {
    try {
        const { data } = await getGitHubFile();
        res.json(data);
    } catch (error) {
        console.error('Error obteniendo datos:', error.message);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

// Obtener solo staff (público)
app.get('/api/staff', async (req, res) => {
    try {
        const { data } = await getGitHubFile();
        res.json({
            staff: data.staff || [],
            config: data.config || {},
            lastUpdated: data.lastUpdated
        });
    } catch (error) {
        console.error('Error obteniendo staff:', error.message);
        res.status(500).json({ error: 'Error al obtener staff' });
    }
});

// Actualizar datos (protegido)
app.post('/api/update', authenticate, async (req, res) => {
    try {
        const newData = req.body;
        
        // Validar datos
        if (!newData.staff || !Array.isArray(newData.staff)) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        // Obtener SHA actual
        const { sha } = await getGitHubFile();
        
        // Actualizar timestamp
        newData.lastUpdated = new Date().toISOString();
        newData.version = "1.0.0";

        // Guardar en GitHub
        const result = await updateGitHubFile(newData, sha);
        
        res.json({
            success: true,
            message: 'Datos actualizados correctamente',
            lastUpdated: newData.lastUpdated,
            sha: result.sha
        });
    } catch (error) {
        console.error('Error actualizando datos:', error.message);
        res.status(500).json({ error: 'Error al actualizar datos' });
    }
});

// Sincronizar (protegido)
app.post('/api/sync', authenticate, async (req, res) => {
    try {
        const localData = req.body;
        
        // Obtener datos de GitHub
        const { data: githubData, sha } = await getGitHubFile();
        
        // Comparar timestamps (última actualización)
        const localTime = new Date(localData.lastUpdated || 0).getTime();
        const githubTime = new Date(githubData.lastUpdated || 0).getTime();
        
        let finalData;
        let message;
        
        if (githubTime > localTime) {
            // GitHub tiene datos más recientes
            finalData = githubData;
            message = 'Datos sincronizados desde GitHub (GitHub tenía versión más reciente)';
        } else {
            // Local tiene datos más recientes o iguales
            finalData = localData;
            finalData.lastUpdated = new Date().toISOString();
            
            // Guardar en GitHub
            await updateGitHubFile(finalData, sha);
            message = 'Datos sincronizados a GitHub (local tenía versión más reciente)';
        }
        
        res.json({
            success: true,
            message: message,
            data: finalData,
            lastUpdated: finalData.lastUpdated
        });
    } catch (error) {
        console.error('Error sincronizando:', error.message);
        res.status(500).json({ error: 'Error sincronizando datos' });
    }
});

// Verificar conexión
app.get('/api/status', async (req, res) => {
    try {
        await getGitHubFile();
        res.json({
            status: 'connected',
            repo: `${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`,
            lastChecked: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'disconnected',
            error: error.message,
            lastChecked: new Date().toISOString()
        });
    }
});

// =============================
// INICIAR SERVIDOR
// =============================

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
    console.log(`📁 Repositorio: ${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`);
    console.log(`🔐 Modo: ${process.env.NODE_ENV || 'development'}`);
});