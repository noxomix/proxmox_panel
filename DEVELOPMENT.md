# Development Guide

## Frontend Proxy Setup

Das Backend ist so konfiguriert, dass es in der Entwicklung automatisch alle nicht-API Routen an den Vue Dev Server weiterleitet.

### Wie es funktioniert

1. **Backend** läuft auf `http://localhost:3000` 
2. **Frontend (Vite)** läuft intern auf `http://localhost:3001`
3. **Proxy-Middleware** leitet alle nicht-API Routen an Vite weiter
4. **Du verwendest nur** `http://localhost:3000` für alles

### Development Commands

```bash
# Beide Server gleichzeitig starten (mit Proxy) - STANDARD
bun dev

# Nur Backend
bun dev:backend

# Nur Frontend (direkter Zugriff auf 3001)
bun frontend
```

### Single-Port Entwicklung

**Zugriff nur über `http://localhost:3000`:**
- ✅ `/api/*` → Backend API (direkt)
- ✅ `/health` → Backend Health Check (direkt)  
- ✅ `/` → Vue App (proxy zu Vite)
- ✅ `/login` → Vue App (proxy zu Vite)
- ✅ `/dashboard` → Vue App (proxy zu Vite)
- ✅ `/@vite/*` → Vite Dev Assets (proxy zu Vite)
- ✅ `/*.js` → Vue Modules (proxy zu Vite)
- ✅ `/*.css` → Vue Styles (proxy zu Vite)

### Vorteile

- **Ein Port**: Nur `http://localhost:3000` für Development
- **Keine CORS Issues**: Alles läuft auf gleicher Domain/Port
- **Hot Reload**: Vite HMR funktioniert perfekt durch Proxy
- **Production-like**: Verhalten wie in echtem Deployment
- **API Calls**: Relative Pfade funktionieren (`/api/auth/login`)

### Environment Variables

```env
# Backend (.env)
FRONTEND_URL=http://localhost:3001  # Internal Vite server
CORS_ORIGIN=http://localhost:3000   # Public facing port
```

### Vite Konfiguration

Das Frontend ist so konfiguriert, dass es mit dem Proxy harmoniert:

```javascript
// vite.config.js
server: {
  port: 3001,
  host: '0.0.0.0',
  cors: true,
  origin: 'http://localhost:3000' // Backend URL
}
```

### Troubleshooting

1. **Frontend lädt nicht**: Prüfe ob der Vue Dev Server auf Port 3001 läuft
2. **API calls fehlschlagen**: Prüfe `/api/` Prefix in Frontend requests
3. **Hot Reload funktioniert nicht**: Prüfe Vite HMR Konfiguration