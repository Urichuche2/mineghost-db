// =============================
// CONFIGURACIÓN
// =============================

const API_URL = 'http://localhost:3001/api';
const ADMIN_TOKEN = 'admin123';

const DB = {
    staff: [],
    usuarios: [],
    config: {},
    lastUpdated: null
};

let pollInterval = null;
const POLL_INTERVAL = 10000;

// =============================
// FUNCIONES DE API MEJORADAS
// =============================

async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        timeout: 10000 // 10 segundos timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error en API ${endpoint}:`, error.message);
        throw error;
    }
}

// =============================
// INICIALIZACIÓN MEJORADA
// =============================

async function initDatabase() {
    try {
        console.log('🔄 Inicializando base de datos...');
        
        // Intentar cargar desde el backend
        const data = await apiRequest('/data');
        
        // FUSIONAR datos, no reemplazar completamente
        mergeDatabaseData(data);
        
        console.log('✅ Datos cargados desde backend');
        
        // Iniciar polling
        startPolling();
        
        window.DB = DB;
        return true;
        
    } catch (error) {
        console.warn('⚠️ Fallback a datos locales:', error.message);
        
        loadFromLocalStorage();
        window.DB = DB;
        
        return false;
    }
}

// =============================
// FUSIÓN INTELIGENTE DE DATOS
// =============================

function mergeDatabaseData(newData) {
    // Staff: Fusionar por ID
    if (newData.staff && Array.isArray(newData.staff)) {
        const existingIds = new Set(DB.staff.map(s => s.id));
        
        newData.staff.forEach(newStaff => {
            const existingIndex = DB.staff.findIndex(s => s.id === newStaff.id);
            
            if (existingIndex >= 0) {
                // Actualizar existente manteniendo algunos campos si no están en newData
                DB.staff[existingIndex] = {
                    ...DB.staff[existingIndex],
                    ...newStaff,
                    // Asegurar que estos campos no se pierdan
                    id: newStaff.id || DB.staff[existingIndex].id
                };
            } else {
                // Agregar nuevo
                DB.staff.push({
                    id: newStaff.id || Date.now() + Math.random(),
                    nombre: filterText(newStaff.nombre || ''),
                    usuario: filterText(newStaff.usuario || ''),
                    rango: filterText(newStaff.rango || ''),
                    premium: newStaff.premium || 'No',
                    invitadoPor: filterText(newStaff.invitadoPor || ''),
                    fecha: newStaff.fecha || new Date().toLocaleString('es-ES')
                });
            }
        });
        
        // Ordenar por ID
        DB.staff.sort((a, b) => a.id - b.id);
    }
    
    // Usuarios: Fusionar por username
    if (newData.usuarios && Array.isArray(newData.usuarios)) {
        newData.usuarios.forEach(newUser => {
            const existingIndex = DB.usuarios.findIndex(u => u.username === newUser.username);
            
            if (existingIndex >= 0) {
                // Actualizar existente
                DB.usuarios[existingIndex] = {
                    ...DB.usuarios[existingIndex],
                    ...newUser
                };
            } else {
                // Agregar nuevo
                DB.usuarios.push({
                    id: newUser.id || Date.now(),
                    username: newUser.username,
                    password: newUser.password || '123456'
                });
            }
        });
        
        // Asegurar que admin siempre exista
        if (!DB.usuarios.find(u => u.username === 'admin')) {
            DB.usuarios.unshift({
                id: 1,
                username: 'admin',
                password: 'admin123'
            });
        }
    }
    
    // Config: Fusionar
    if (newData.config) {
        DB.config = {
            ...DB.config,
            ...newData.config
        };
    }
    
    // Actualizar timestamp
    DB.lastUpdated = newData.lastUpdated || new Date().toISOString();
    
    // Guardar localmente como backup
    saveToLocalStorage();
}

// =============================
// SISTEMA DE POLLING CORREGIDO
// =============================

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        await checkForUpdates();
    }, POLL_INTERVAL);
    
    console.log(`🔄 Polling iniciado cada ${POLL_INTERVAL / 1000} segundos`);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('⏹️ Polling detenido');
    }
}

async function checkForUpdates() {
    try {
        const response = await fetch(`${API_URL}/data?t=${Date.now()}`);
        
        if (!response.ok) return false;
        
        const remoteData = await response.json();
        const remoteTime = new Date(remoteData.lastUpdated || 0).getTime();
        const localTime = new Date(DB.lastUpdated || 0).getTime();
        
        // Solo actualizar si hay datos más recientes
        if (remoteTime > localTime) {
            console.log('🔄 Cambios detectados, fusionando datos...');
            
            // Fusionar datos, no reemplazar
            mergeDatabaseData(remoteData);
            
            // Notificar cambios
            notifyDataChanged();
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.warn('⚠️ Error verificando actualizaciones:', error.message);
        return false;
    }
}

function notifyDataChanged() {
    const event = new CustomEvent('dataUpdated', {
        detail: { 
            timestamp: DB.lastUpdated,
            staffCount: DB.staff.length,
            userCount: DB.usuarios.length
        }
    });
    window.dispatchEvent(event);
    
    if (typeof window.actualizarTablas === 'function') {
        window.actualizarTablas();
    }
    
    if (typeof window.mostrarMensaje === 'function') {
        window.mostrarMensaje('🔄 Datos actualizados desde el servidor', 'info');
    }
}

// =============================
// GUARDADO INTELIGENTE
// =============================

async function saveDatabase() {
    try {
        // Preparar datos para enviar (solo los necesarios)
        const dataToSave = {
            staff: DB.staff.map(s => ({
                id: s.id,
                nombre: filterText(s.nombre),
                usuario: filterText(s.usuario),
                rango: filterText(s.rango),
                premium: s.premium,
                invitadoPor: filterText(s.invitadoPor),
                fecha: s.fecha
            })),
            usuarios: DB.usuarios.map(u => ({
                id: u.id,
                username: u.username,
                password: u.password
            })),
            config: DB.config,
            lastUpdated: new Date().toISOString(),
            version: "1.0.0"
        };
        
        console.log('💾 Guardando datos...', dataToSave.staff.length, 'staff,', dataToSave.usuarios.length, 'usuarios');
        
        // Enviar al backend
        const result = await apiRequest('/update', 'POST', dataToSave);
        
        if (result.success) {
            DB.lastUpdated = result.lastUpdated;
            saveToLocalStorage();
            
            return { 
                success: true, 
                message: '✅ Datos guardados correctamente',
                lastUpdated: DB.lastUpdated
            };
        }
        
        throw new Error('Error del servidor al guardar');
        
    } catch (error) {
        console.error('❌ Error guardando en backend:', error);
        
        // Fallback: guardar solo localmente
        saveToLocalStorage();
        
        return { 
            success: false, 
            message: '💾 Guardado localmente (sin conexión al servidor)',
            error: error.message 
        };
    }
}

// =============================
// FUNCIONES PARA STAFF (CORREGIDAS)
// =============================

function getStaff() {
    return DB.staff;
}

function addStaff(staffData) {
    // Generar ID único
    const newId = DB.staff.length > 0 ? Math.max(...DB.staff.map(s => s.id)) + 1 : 1;
    
    const newStaff = {
        id: newId,
        nombre: filterText(staffData.nombre || ''),
        usuario: filterText(staffData.usuario || ''),
        rango: filterText(staffData.rango || ''),
        premium: staffData.premium || 'No',
        invitadoPor: filterText(staffData.invitadoPor || ''),
        fecha: new Date().toLocaleString('es-ES')
    };
    
    DB.staff.push(newStaff);
    
    // Guardar cambios
    saveDatabase();
    
    return newStaff;
}

function deleteStaff(id) {
    const index = DB.staff.findIndex(s => s.id === id);
    if (index !== -1) {
        const deleted = DB.staff.splice(index, 1)[0];
        saveDatabase();
        return deleted;
    }
    return null;
}

function updateStaff(id, updates) {
    const index = DB.staff.findIndex(s => s.id === id);
    if (index !== -1) {
        DB.staff[index] = {
            ...DB.staff[index],
            ...updates,
            id: id, // Asegurar que el ID no cambie
            nombre: filterText(updates.nombre || DB.staff[index].nombre),
            usuario: filterText(updates.usuario || DB.staff[index].usuario),
            rango: filterText(updates.rango || DB.staff[index].rango),
            invitadoPor: filterText(updates.invitadoPor || DB.staff[index].invitadoPor)
        };
        
        saveDatabase();
        return DB.staff[index];
    }
    return null;
}

// =============================
// FUNCIONES PARA USUARIOS (CORREGIDAS)
// =============================

function getUsers() {
    return DB.usuarios;
}

function validateUser(username, password) {
    const user = DB.usuarios.find(u => u.username === username && u.password === password);
    return !!user;
}

function addUser(username, password) {
    // Verificar si ya existe
    const exists = DB.usuarios.find(u => u.username === username);
    if (exists) return false;
    
    // Generar ID único
    const newId = DB.usuarios.length > 0 ? Math.max(...DB.usuarios.map(u => u.id)) + 1 : 1;
    
    DB.usuarios.push({ 
        id: newId,
        username: username,
        password: password
    });
    
    saveDatabase();
    return true;
}

function deleteUser(username) {
    // No permitir eliminar admin
    if (username === 'admin') return false;
    
    const index = DB.usuarios.findIndex(u => u.username === username);
    if (index !== -1) {
        DB.usuarios.splice(index, 1);
        saveDatabase();
        return true;
    }
    return false;
}

function updateUserPassword(username, newPassword) {
    const user = DB.usuarios.find(u => u.username === username);
    if (user) {
        user.password = newPassword;
        saveDatabase();
        return true;
    }
    return false;
}

function getUserById(id) {
    return DB.usuarios.find(u => u.id === id);
}

// =============================
// FUNCIONES LOCALSTORAGE MEJORADAS
// =============================

function saveToLocalStorage() {
    const dataToSave = {
        staff: DB.staff,
        usuarios: DB.usuarios,
        config: DB.config,
        lastUpdated: DB.lastUpdated,
        version: "1.0.0"
    };
    
    localStorage.setItem('mineghost_data', JSON.stringify(dataToSave));
    localStorage.setItem('lastLocalSave', new Date().toISOString());
    
    console.log('💾 Guardado local:', DB.staff.length, 'staff,', DB.usuarios.length, 'usuarios');
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('mineghost_data');
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            // Fusionar datos locales, no reemplazar
            if (data.staff) {
                DB.staff = data.staff.map(s => ({
                    id: s.id || Date.now() + Math.random(),
                    nombre: filterText(s.nombre || ''),
                    usuario: filterText(s.usuario || ''),
                    rango: filterText(s.rango || ''),
                    premium: s.premium || 'No',
                    invitadoPor: filterText(s.invitadoPor || ''),
                    fecha: s.fecha || new Date().toLocaleString('es-ES')
                }));
            }
            
            if (data.usuarios) {
                DB.usuarios = data.usuarios;
            }
            
            if (data.config) {
                DB.config = data.config;
            }
            
            DB.lastUpdated = data.lastUpdated || new Date().toISOString();
            
            console.log('📂 Datos locales cargados:', DB.staff.length, 'staff,', DB.usuarios.length, 'usuarios');
            
        } catch (error) {
            console.error('❌ Error cargando datos locales:', error);
            initializeDefaultData();
        }
    } else {
        initializeDefaultData();
    }
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
        { 
            id: 1, 
            username: 'admin', 
            password: 'admin123' 
        }
    ];
    
    DB.config = { 
        adminPassword: 'admin123',
        totalMembers: 1
    };
    
    DB.lastUpdated = new Date().toISOString();
    
    saveToLocalStorage();
    console.log('📝 Datos por defecto inicializados');
}

// =============================
// FUNCIONES AUXILIARES
// =============================

function filterText(text) {
    if (!text) return '';
    
    // Limpiar texto manteniendo emojis
    let filtered = text
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    
    // Limitar longitud
    if (filtered.length > 100) {
        filtered = filtered.substring(0, 97) + '...';
    }
    
    return filtered;
}

async function checkServerStatus() {
    try {
        const response = await fetch(`${API_URL}/status`, { timeout: 5000 });
        if (response.ok) {
            const data = await response.json();
            return data;
        }
        return { status: 'disconnected' };
    } catch (error) {
        return { status: 'disconnected', error: error.message };
    }
}

async function forceRefresh() {
    try {
        const response = await fetch(`${API_URL}/data?t=${Date.now()}`);
        
        if (!response.ok) return false;
        
        const remoteData = await response.json();
        
        // Fusionar datos
        mergeDatabaseData(remoteData);
        
        // Notificar
        notifyDataChanged();
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en refresh manual:', error);
        return false;
    }
}

function getLastUpdate() {
    return DB.lastUpdated || localStorage.getItem('lastLocalSave') || 'Nunca';
}

function getDatabaseStats() {
    return {
        staff: DB.staff.length,
        users: DB.usuarios.length,
        lastUpdated: DB.lastUpdated,
        config: DB.config
    };
}

// =============================
// IMPORT/EXPORT MEJORADO
// =============================

function exportToJSON() {
    const data = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        staff: DB.staff,
        usuarios: DB.usuarios,
        config: DB.config,
        lastUpdated: DB.lastUpdated,
        stats: {
            totalStaff: DB.staff.length,
            totalUsers: DB.usuarios.length
        }
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
    
    console.log('📤 Backup exportado:', data.staff.length, 'staff');
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
                    throw new Error('Formato de archivo inválido: falta array staff');
                }
                
                console.log('📥 Importando datos:', importedData.staff.length, 'staff');
                
                // Fusionar datos importados con los existentes
                mergeDatabaseData(importedData);
                
                // Guardar cambios
                await saveDatabase();
                
                // Notificar cambios
                notifyDataChanged();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ Error importando:', error);
                reject(`Error: ${error.message}`);
            }
        };
        
        reader.onerror = () => reject('Error leyendo el archivo');
        reader.readAsText(file);
    });
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
window.validateUser = validateUser;
window.addUser = addUser;
window.deleteUser = deleteUser;
window.updateUserPassword = updateUserPassword;
window.getUserById = getUserById;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.checkServerStatus = checkServerStatus;
window.forceRefresh = forceRefresh;
window.getLastUpdate = getLastUpdate;
window.getDatabaseStats = getDatabaseStats;
window.startPolling = startPolling;
window.stopPolling = stopPolling;
window.filterText = filterText;

// Para debugging
window._DB = DB;