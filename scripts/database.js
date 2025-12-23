// =============================
// CONFIGURACIÓN DEL SISTEMA
// =============================

const DB = {
    staff: [],
    usuarios: [
        { id: 1, username: 'admin', password: 'admin123' }
    ],
    config: {
        adminPassword: 'admin2025'
    }
};

// Configuración GitHub (modificar estos valores)
const GITHUB_CONFIG = {
    enabled: false,
    repoOwner: 'tu-usuario',
    repoName: 'tu-repositorio',
    token: '',
    filePath: 'data/staff.json'
};

// URLs de API
const API_URL = 'http://localhost:3001/api';
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

// =============================
// INICIALIZACIÓN
// =============================

async function initDatabase() {
    try {
        console.log('🔄 Inicializando base de datos...');
        
        // 1. Intentar cargar desde GitHub (si está configurado)
        if (GITHUB_CONFIG.enabled && GITHUB_CONFIG.repoOwner && GITHUB_CONFIG.repoName) {
            console.log('🌐 Intentando cargar desde GitHub...');
            const githubData = await loadFromGitHub();
            if (githubData) {
                console.log('✅ Datos cargados desde GitHub');
                return;
            }
        }
        
        // 2. Intentar cargar desde API local
        console.log('💻 Intentando conectar a API local...');
        const apiData = await loadFromAPI();
        if (apiData) {
            console.log('✅ Datos cargados desde API local');
            return;
        }
        
        // 3. Fallback a localStorage
        console.log('💾 Cargando datos locales...');
        loadFromLocalStorage();
        
        // 4. Si no hay datos, inicializar con valores por defecto
        if (!DB.staff || DB.staff.length === 0) {
            console.log('📝 Inicializando datos por defecto...');
            initializeDefaultData();
        }
        
        console.log('✅ Base de datos lista');
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        loadFromLocalStorage();
    }
}

// =============================
// MÉTODOS DE CARGA DE DATOS
// =============================

async function loadFromGitHub() {
    try {
        // Intentar cargar el archivo JSON desde GitHub (raw)
        const rawUrl = `${GITHUB_RAW}/${GITHUB_CONFIG.repoOwner}/${GITHUB_CONFIG.repoName}/main/${GITHUB_CONFIG.filePath}`;
        const response = await fetch(rawUrl);
        
        if (response.ok) {
            const data = await response.json();
            
            // Validar estructura del archivo
            if (data.staff && Array.isArray(data.staff)) {
                DB.staff = data.staff;
                DB.usuarios = data.usuarios || DB.usuarios;
                DB.config = data.config || DB.config;
                
                // Guardar copia local
                saveToLocalStorage();
                return true;
            }
        }
        return false;
    } catch (error) {
        console.warn('⚠️ No se pudo cargar desde GitHub:', error.message);
        return false;
    }
}

async function loadFromAPI() {
    try {
        const response = await fetch(`${API_URL}/staff`);
        if (response.ok) {
            const data = await response.json();
            if (data.staff) {
                DB.staff = data.staff;
                DB.config = data.config || DB.config;
                saveToLocalStorage();
                return true;
            }
        }
        return false;
    } catch (error) {
        console.warn('⚠️ API local no disponible:', error.message);
        return false;
    }
}

function loadFromLocalStorage() {
    const savedStaff = localStorage.getItem('DB_staff');
    const savedUsers = localStorage.getItem('DB_usuarios');
    const savedConfig = localStorage.getItem('DB_config');
    
    if (savedStaff) DB.staff = JSON.parse(savedStaff);
    if (savedUsers) DB.usuarios = JSON.parse(savedUsers);
    if (savedConfig) DB.config = JSON.parse(savedConfig);
}

function initializeDefaultData() {
    DB.staff = [
        {
            id: 1,
            nombre: "Admin",
            usuario: "admin#0001",
            rango: "Owner",
            premium: "Sí",
            invitadoPor: "Sistema",
            fecha: new Date().toLocaleString('es-ES')
        }
    ];
    DB.usuarios = [
        { id: 1, username: 'admin', password: 'admin123' }
    ];
    DB.config = {
        adminPassword: 'admin2025',
        lastUpdate: new Date().toISOString()
    };
    
    saveToLocalStorage();
}

// =============================
// MÉTODOS DE GUARDADO
// =============================

async function saveDatabase() {
    console.log('💾 Guardando datos...');
    
    // 1. Guardar siempre en localStorage (primero, más rápido)
    saveToLocalStorage();
    
    // 2. Intentar guardar en GitHub (si está configurado)
    if (GITHUB_CONFIG.enabled && GITHUB_CONFIG.token) {
        const githubSuccess = await saveToGitHub();
        if (githubSuccess) {
            console.log('✅ Datos guardados en GitHub');
            return { success: true, source: 'github' };
        }
    }
    
    // 3. Intentar guardar en API local
    const apiSuccess = await saveToAPI();
    if (apiSuccess) {
        console.log('✅ Datos guardados en API local');
        return { success: true, source: 'api' };
    }
    
    // 4. Solo guardado local
    console.log('💾 Datos guardados solo localmente');
    return { success: true, source: 'local' };
}

async function saveToGitHub() {
    try {
        if (!GITHUB_CONFIG.token) {
            console.warn('⚠️ Token de GitHub no configurado');
            return false;
        }
        
        // Preparar datos para GitHub
        const dataToSave = {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
            staff: DB.staff,
            usuarios: DB.usuarios,
            config: DB.config
        };
        
        // Primero obtener el SHA del archivo actual (si existe)
        const getUrl = `${GITHUB_API}/repos/${GITHUB_CONFIG.repoOwner}/${GITHUB_CONFIG.repoName}/contents/${GITHUB_CONFIG.filePath}`;
        const getResponse = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = null;
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }
        
        // Crear o actualizar el archivo
        const content = btoa(JSON.stringify(dataToSave, null, 2));
        const updateData = {
            message: `Actualización desde MineGhost - ${new Date().toLocaleString('es-ES')}`,
            content: content,
            ...(sha ? { sha: sha } : {})
        };
        
        const updateResponse = await fetch(getUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
            console.log('📤 Datos subidos a GitHub exitosamente');
            return true;
        } else {
            console.error('❌ Error subiendo a GitHub:', await updateResponse.text());
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error guardando en GitHub:', error);
        return false;
    }
}

async function saveToAPI() {
    try {
        const response = await fetch(`${API_URL}/github/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staff: DB.staff,
                usuarios: DB.usuarios,
                config: DB.config
            })
        });
        
        return response.ok;
    } catch (error) {
        console.warn('⚠️ Error guardando en API:', error.message);
        return false;
    }
}

function saveToLocalStorage() {
    localStorage.setItem('DB_staff', JSON.stringify(DB.staff));
    localStorage.setItem('DB_usuarios', JSON.stringify(DB.usuarios));
    localStorage.setItem('DB_config', JSON.stringify(DB.config));
    localStorage.setItem('lastUpdate', new Date().toISOString());
}

// =============================
// FUNCIONES DE STAFF
// =============================

function addStaff(data) {
    const newStaff = {
        id: Date.now(),
        nombre: data.nombre,
        usuario: data.usuario,
        rango: data.rango,
        premium: data.premium,
        invitadoPor: data.invitadoPor,
        fecha: new Date().toLocaleString('es-ES')
    };
    
    DB.staff.push(newStaff);
    saveDatabase();
    
    // Mostrar notificación
    showNotification('✅ Staff agregado correctamente', 'success');
    
    return newStaff;
}

function getStaff() {
    return DB.staff;
}

function deleteStaff(id) {
    DB.staff = DB.staff.filter(s => s.id !== id);
    saveDatabase();
    
    showNotification('✅ Staff eliminado correctamente', 'success');
    return true;
}

function updateStaff(id, data) {
    const staff = DB.staff.find(s => s.id === id);
    if (staff) {
        Object.assign(staff, data);
        saveDatabase();
        return staff;
    }
    return null;
}

// =============================
// FUNCIONES DE USUARIOS
// =============================

function addUser(username, password) {
    const exists = DB.usuarios.find(u => u.username === username);
    if (exists) {
        showNotification('❌ Este usuario ya existe', 'error');
        return null;
    }
    
    const newUser = {
        id: Date.now(),
        username,
        password
    };
    
    DB.usuarios.push(newUser);
    saveDatabase();
    
    showNotification('✅ Usuario agregado correctamente', 'success');
    return newUser;
}

function getUsers() {
    return DB.usuarios;
}

function deleteUser(username) {
    if (username === 'admin') {
        showNotification('❌ No puedes eliminar al usuario admin', 'error');
        return false;
    }
    
    DB.usuarios = DB.usuarios.filter(u => u.username !== username);
    saveDatabase();
    
    showNotification('✅ Usuario eliminado correctamente', 'success');
    return true;
}

function updateUserPassword(username, newPassword) {
    const user = DB.usuarios.find(u => u.username === username);
    if (user) {
        user.password = newPassword;
        saveDatabase();
        
        showNotification('✅ Contraseña actualizada', 'success');
        return true;
    }
    
    showNotification('❌ Usuario no encontrado', 'error');
    return false;
}

function validateUser(username, password) {
    const user = DB.usuarios.find(u => u.username === username && u.password === password);
    return user ? true : false;
}

// =============================
// IMPORT/EXPORT
// =============================

function exportToJSON() {
    const data = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        staff: DB.staff,
        usuarios: DB.usuarios,
        config: DB.config
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mineghost_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('📤 Backup exportado correctamente', 'success');
    
    return true;
}

async function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validar estructura
                if (!importedData.staff || !Array.isArray(importedData.staff)) {
                    throw new Error('Formato de archivo inválido');
                }
                
                // Actualizar datos
                DB.staff = importedData.staff;
                DB.usuarios = importedData.usuarios || DB.usuarios;
                DB.config = importedData.config || DB.config;
                
                // Guardar
                await saveDatabase();
                
                showNotification('📥 Datos importados correctamente', 'success');
                resolve(true);
                
            } catch (error) {
                showNotification(`❌ Error: ${error.message}`, 'error');
                reject(error.message);
            }
        };
        
        reader.onerror = () => {
            showNotification('❌ Error leyendo el archivo', 'error');
            reject('Error leyendo el archivo');
        };
        
        reader.readAsText(file);
    });
}

// =============================
// CONFIGURACIÓN GITHUB
// =============================

function configureGitHub(owner, repo, token) {
    GITHUB_CONFIG.repoOwner = owner;
    GITHUB_CONFIG.repoName = repo;
    
    if (token) {
        GITHUB_CONFIG.token = token;
        GITHUB_CONFIG.enabled = true;
        
        // Guardar configuración en localStorage
        localStorage.setItem('github_config', JSON.stringify(GITHUB_CONFIG));
    }
    
    return checkGitHubConnection();
}

async function checkGitHubConnection() {
    try {
        const rawUrl = `${GITHUB_RAW}/${GITHUB_CONFIG.repoOwner}/${GITHUB_CONFIG.repoName}/main/${GITHUB_CONFIG.filePath}`;
        const response = await fetch(rawUrl, { method: 'HEAD' });
        
        return {
            connected: response.ok,
            repo: `${GITHUB_CONFIG.repoOwner}/${GITHUB_CONFIG.repoName}`,
            lastUpdate: localStorage.getItem('lastUpdate') || 'Nunca'
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
}

function getGitHubConfig() {
    const savedConfig = localStorage.getItem('github_config');
    if (savedConfig) {
        Object.assign(GITHUB_CONFIG, JSON.parse(savedConfig));
    }
    
    return GITHUB_CONFIG;
}

// =============================
// FUNCIONES AUXILIARES
// =============================

function showNotification(message, type = 'info') {
    // Si existe la función mostrarMensaje en el contexto global, usarla
    if (typeof window.mostrarMensaje === 'function') {
        window.mostrarMensaje(message, type);
    } else {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#f44336' : '#007bff'};
            color: white;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// =============================
// EXPORTAR FUNCIONES GLOBALES
// =============================

window.initDatabase = initDatabase;
window.getStaff = getStaff;
window.addStaff = addStaff;
window.deleteStaff = deleteStaff;
window.updateStaff = updateStaff;
window.getUsers = getUsers;
window.addUser = addUser;
window.deleteUser = deleteUser;
window.updateUserPassword = updateUserPassword;
window.validateUser = validateUser;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.configureGitHub = configureGitHub;
window.checkGitHubConnection = checkGitHubConnection;
window.getGitHubConfig = getGitHubConfig;
window.saveDatabase = saveDatabase;