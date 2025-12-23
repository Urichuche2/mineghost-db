# 🛡️ Mineghost Bot - Panel de Administración

## Descripción
Panel web interactivo para gestionar el equipo de staff del servidor Mineghost. Incluye autenticación de usuarios, base de datos de staff y gestión de credenciales.

## 📁 Estructura de Archivos
```
├── index.html          # Página principal
├── login.php           # Login del panel admin
├── admin.php           # Panel administrativo (requiere login)
├── logout.php          # Cierre de sesión
├── data/               # Carpeta de datos (se crea automáticamente)
│   ├── staff.json      # Base de datos de staff
│   └── users.json      # Usuarios de login
└── README.md           # Este archivo
```

## 🚀 Instalación

### Requisitos
- PHP 7.0 o superior
- Servidor web (Apache, Nginx, etc.) o PHP integrado

### Pasos

1. **Copiar archivos** al servidor web o carpeta raíz del proyecto

2. **Ejecutar con PHP integrado** (para desarrollo):
```bash
php -S localhost:8000
```

3. **Abrir en navegador**:
```
http://localhost:8000
```

## 🔐 Credenciales por Defecto

**Usuario**: `admin`  
**Contraseña**: `admin123`

> ⚠️ **IMPORTANTE**: Cambia la contraseña después del primer login

## 📊 Funcionalidades

### 1. **Base de Datos de Staff** (Pestaña 1)
- ➕ Agregar nuevos miembros del staff
- ✏️ Editar información existente
- 🗑️ Eliminar miembros
- 👥 Lista completa con filtros

**Campos**:
- 👤 Nombre de Usuario
- 🎮 Nick en Discord
- 🏅 Rango (Administrador, Moderador, Helper, Buildero, Otro)
- 💎 Premium (Sí/No)
- 👥 Invitado por
- 📅 Fecha de agregado (automática)

### 2. **Gestión de Usuarios** (Pestaña 2)
- ➕ Crear nuevos usuarios de login
- 🔑 Cambiar contraseñas
- 🗑️ Eliminar usuarios (excepto admin)
- 👥 Lista de usuarios del sistema

## 📝 Notas

- Los datos se almacenan en archivos JSON en la carpeta `data/`
- Las contraseñas están hasheadas con bcrypt
- El usuario `admin` es protegido y no puede ser eliminado
- Las sesiones se cierran automáticamente al desconectarse
- Todos los formularios están validados y sanitizados

## 🎨 Estilos

- Interfaz moderna con gradientes
- Diseño responsivo (funciona en móviles)
- Animaciones suaves
- Emojis para mejor UX

## 🔒 Seguridad

- ✅ Autenticación de sesiones
- ✅ Contraseñas hasheadas (bcrypt)
- ✅ Validación de entrada
- ✅ Protección contra eliminación de admin
- ✅ CSRF tokens implícitos en formularios

## 📱 Compatible con

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Dispositivos móviles

## 🆘 Solución de Problemas

**"Errores de permisos"**:
- Asegúrate de que el servidor PHP tiene permisos de escritura en la carpeta `data/`

**"404 Not Found"**:
- Verifica que estés accediendo a los archivos `.php`, no `.html`

**"Sesión expirada"**:
- Las sesiones duran hasta que cierres el navegador o hagas logout

## 📧 Soporte

Para reportar bugs o sugerencias, contacta con el administrador del servidor.

---

**Última actualización**: 22/12/2025  
**Versión**: 1.0.0
