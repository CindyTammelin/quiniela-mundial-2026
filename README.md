# ⚽ Quiniela Mundial 2026

Quiniela multijugador en tiempo real para el Mundial FIFA 2026.
npx serve /workspaces/quiniela-mundial-2026/frontend -p 8080
node server.js
**Stack:**
- Frontend: HTML/CSS/JS puro → GitHub Pages
- Base de datos: Firebase Firestore (tiempo real)
- Backend/emails: Node.js + Express → Railway
- Emails: Resend

---

## 📁 Estructura del proyecto

```
quiniela-mundial-2026/
├── frontend/
│   └── index.html        ← La app completa (sube a GitHub Pages)
├── backend/
│   ├── server.js         ← API de emails (sube a Railway)
│   └── package.json
└── README.md
```

---

## 🚀 Paso 1 — Subir a GitHub

1. Ve a https://github.com/new
2. Nombre del repo: `quiniela-mundial-2026`
3. Público ✓ → **Create repository**
4. En tu computadora, abre una terminal y ejecuta:

```bash
git clone https://github.com/CindyTammelin/quiniela-mundial-2026.git
cd quiniela-mundial-2026

# Copia los archivos de este proyecto aquí
# Luego:
git add .
git commit -m "🚀 Initial deploy"
git push origin main
```

---

## 🌐 Paso 2 — Activar GitHub Pages

1. Ve a tu repo en GitHub
2. **Settings** → **Pages** (menú izquierdo)
3. Source: **Deploy from a branch**
4. Branch: `main` → Folder: `/frontend`
5. Clic **Save**
6. En ~2 minutos tu app estará en: `https://cindytammelin.github.io/quiniela-mundial-2026`

---

## 🔥 Paso 3 — Firebase Firestore rules

En la consola de Firebase → Firestore Database → **Rules**, pega esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players: anyone can read/write their own entry
    match /players/{playerId} {
      allow read: if true;
      allow write: if true;
    }
    // Config (results): anyone can read, only authenticated can write
    // For simplicity during Mundial, allow all writes
    match /config/{docId} {
      allow read, write: if true;
    }
    // Notifications
    match /notifications/{docId} {
      allow read, write: if true;
    }
  }
}
```

Haz clic en **Publish**.

---

## 🚂 Paso 4 — Desplegar backend en Railway

### 4a. Obtener API key de Resend
1. Ve a https://resend.com/api-keys
2. Crea una key con nombre `quiniela-2026`
3. Cópiala: `re_xxxxxxxxx`

### 4b. Desplegar en Railway
1. Ve a https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona `CindyTammelin/quiniela-mundial-2026`
4. Railway detecta el backend automáticamente
5. Ve a **Variables** y agrega estas variables de entorno:

```
RESEND_API_KEY = re_eNq8DwBP_GTT4vTXN8RUpLUkT44xsVRpC
FROM_EMAIL     = onboarding@resend.dev
FROM_NAME      = Quiniela Mundial 2026
FRONTEND_URL   = https://cindytammelin.github.io/quiniela-mundial-2026
PORT           = 3000
```

6. Railway te da una URL como: `https://quiniela-backend-xxxx.up.railway.app`

### 4c. Actualizar la URL en el frontend
En `frontend/index.html`, busca esta línea (~línea 15 del script):
```js
var BACKEND_URL = 'https://quiniela-backend.up.railway.app';
```
Cámbiala por tu URL real de Railway, haz commit y push.

---

## ✅ Verificación final

| ¿Qué verificar? | ¿Cómo? |
|---|---|
| Firebase conectado | El indicador API muestra punto verde |
| Picks se guardan | Envía un pronóstico y ve a Tabla |
| Tiempo real funciona | Abre en 2 pestañas, envía pick en una, ve si aparece en la otra |
| Emails funcionan | Admin → Enviar recordatorio a todos |
| Reset funciona | Admin → Borrar todos los datos |

---

## 🔐 Credenciales

- **Contraseña admin:** `Chirrimplin2000`
- **Firebase project:** `quiniela-mundial-2026-46072`
- **Football-data.org token:** `138abdc7cf4845fc8f71ade0fab24e87`

---

## 📧 Tipos de emails

| Acción | Cuándo se envía |
|---|---|
| Nuevos resultados | Automáticamente al guardar resultados en Admin |
| Recordatorio | Botón manual "Recordatorio: ¡Haz tus picks!" en Admin |
| Tabla de posiciones | Botón manual "Enviar tabla de posiciones" en Admin |

---

## 🏆 Sistema de puntos

| Acierto | Puntos |
|---|---|
| Marcador exacto | 5 pts |
| Ganador correcto | 3 pts |
| Todo incorrecto | 0 pts |
