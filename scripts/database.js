// BASE DE DATOS GLOBAL
const DB = {
    staff: [],
    usuarios: [
        { id: 1, username: 'admin', password: 'admin123' }
    ],
    config: {
        adminPassword: 'admin2025'  // Contraseña para gestionar usuarios
    }
};

// INICIALIZAR BASE DE DATOS
function initDatabase() {
    const staff = localStorage.getItem('DB_staff');
    const usuarios = localStorage.getItem('DB_usuarios');
    const config = localStorage.getItem('DB_config');
    
    if (staff) DB.staff = JSON.parse(staff);
    if (usuarios) DB.usuarios = JSON.parse(usuarios);
    if (config) DB.config = JSON.parse(config);
}

// GUARDAR DATOS
function saveDatabase() {
    localStorage.setItem('DB_staff', JSON.stringify(DB.staff));
    localStorage.setItem('DB_usuarios', JSON.stringify(DB.usuarios));
    localStorage.setItem('DB_config', JSON.stringify(DB.config));
    
    // Auto-guardar como JSON en el navegador
    autoSaveJSON();
}

// AUTO-GUARDAR COMO JSON (simula guardado en archivo)
function autoSaveJSON() {
    const data = {
        timestamp: new Date().toISOString(),
        staff: DB.staff,
        usuarios: DB.usuarios,
        config: DB.config
    };
    localStorage.setItem('DB_backup', JSON.stringify(data));
}

// EXPORTAR DATOS A JSON (descargar archivo)
function exportToJSON() {
    const data = {
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
}

// IMPORTAR DATOS DESDE JSON
function importFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.staff && data.usuarios && data.config) {
                    DB.staff = data.staff;
                    DB.usuarios = data.usuarios;
                    DB.config = data.config;
                    saveDatabase();
                    resolve(true);
                } else {
                    reject('Formato de archivo inválido');
                }
            } catch (error) {
                reject('Error al parsear JSON: ' + error.message);
            }
        };
        reader.onerror = () => reject('Error al leer el archivo');
        reader.readAsText(file);
    });
}

// FUNCIONES DE STAFF
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
    return newStaff;
}

function getStaff() {
    return DB.staff;
}

function deleteStaff(id) {
    DB.staff = DB.staff.filter(s => s.id !== id);
    saveDatabase();
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

// FUNCIONES DE USUARIOS
function addUser(username, password) {
    const exists = DB.usuarios.find(u => u.username === username);
    if (exists) return null;
    
    const newUser = {
        id: Date.now(),
        username,
        password
    };
    DB.usuarios.push(newUser);
    saveDatabase();
    return newUser;
}

function getUsers() {
    return DB.usuarios;
}

function deleteUser(username) {
    if (username === 'admin') return false;
    DB.usuarios = DB.usuarios.filter(u => u.username !== username);
    saveDatabase();
    return true;
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

function validateUser(username, password) {
    return DB.usuarios.find(u => u.username === username && u.password === password);
}
