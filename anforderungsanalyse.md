# API Anforderungsanalyse - Vue Frontend

Diese Dokumentation beschreibt alle API-Endpunkte, die vom Vue Frontend verwendet werden, einschließlich ihrer Anforderungen und erwarteten Antwortstrukturen.

## Überblick

Das Vue Frontend kommuniziert mit 27 verschiedenen API-Endpunkten, die in folgende Kategorien unterteilt sind:
- **Authentifizierung** (10 Endpunkte)
- **Benutzerverwaltung** (5 Endpunkte)
- **Rollenverwaltung** (6 Endpunkte)
- **Berechtigungen** (1 Endpunkt)
- **Namespace-Verwaltung** (5 Endpunkte)

---

## 1. Authentifizierung

### 1.1 Benutzer-Login
```http
POST /api/auth/login
```

**Verwendung:** `views/Login.vue`, `utils/api.js`

**Request:**
```json
{
  "identity": "string", // E-Mail oder Benutzername
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "username": "string"
    }
  },
  "message": "Login successful"
}
```

---

### 1.2 Benutzer-Logout
```http
POST /api/auth/logout
```

**Verwendung:** `layouts/AppLayout.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Request:** Kein Body erforderlich

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful"
}
```

---

### 1.3 Aktuelle Benutzerdaten abrufen
```http
GET /api/auth/me
```

**Verwendung:** `layouts/AppLayout.vue`, `views/Dashboard.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "username": "string",
      "status": "active" | "disabled" | "blocked",
      "created_at": "string"
    },
    "token_expires_at": "string"
  }
}
```

---

### 1.4 Benutzer-Profil abrufen
```http
GET /api/auth/profile
```

**Verwendung:** `views/Users.vue`, `components/UserModal.vue`, `composables/useRoleHierarchy.js`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role_name": "string",
      "role_display_name": "string"
    }
  }
}
```

---

### 1.5 Passwort ändern
```http
POST /api/auth/change-password
```

**Verwendung:** `views/Profile.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Request:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

### 1.6 API-Token generieren
```http
POST /api/auth/generate-api-token
```

**Verwendung:** `views/Profile.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Request:** Kein Body erforderlich

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "expires_at": "string",
    "type": "api"
  }
}
```

---

### 1.7 Aktuellen API-Token abrufen
```http
GET /api/auth/api-token
```

**Verwendung:** `views/Profile.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "expires_at": "string",
    "type": "api",
    "created_at": "string"
  }
}
```

---

### 1.8 Aktive Sitzungen abrufen
```http
GET /api/auth/sessions
```

**Verwendung:** `views/Profile.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "user_agent": "string",
      "ip_address": "string",
      "updated_at": "string",
      "expires_at": "string",
      "is_current": true
    }
  ]
}
```

---

### 1.9 Bestimmte Sitzung beenden
```http
DELETE /api/auth/sessions/{sessionId}
```

**Verwendung:** `views/Profile.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Session revoked successfully"
  }
}
```

---

### 1.10 Alle anderen Sitzungen beenden
```http
DELETE /api/auth/sessions
```

**Verwendung:** `views/Profile.vue`, `utils/api.js`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "All other sessions revoked successfully"
  }
}
```

---

## 2. Benutzerverwaltung

### 2.1 Benutzer auflisten
```http
GET /api/users
```

**Verwendung:** `views/Users.vue`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (optional)

**Query Parameter:**
- `page`: number (Standard: 1)
- `limit`: number (Standard: 10, max: 100)
- `sortBy`: string (Standard: 'created_at')
- `sortOrder`: "asc" | "desc" (Standard: 'desc')
- `search`: string (optional)
- `status`: "active" | "disabled" | "blocked" (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "string",
        "name": "string",
        "username": "string",
        "email": "string",
        "role_id": "string",
        "role_name": "string",
        "role_display_name": "string",
        "status": "active" | "disabled" | "blocked",
        "created_at": "string",
        "updated_at": "string",
        "assigned_at": "string",
        "number_of_permissions": 0,
        "can_edit": true
      }
    ],
    "namespace": {
      "id": "string",
      "name": "string",
      "full_path": "string"
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 2.2 Benutzer erstellen
```http
POST /api/users
```

**Verwendung:** `components/UserModal.vue`, `composables/useUserForm.js`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (optional)

**Request:**
```json
{
  "name": "string",
  "username": "string",
  "email": "string",
  "password": "string",
  "role_id": "string",
  "status": "active" | "disabled" | "blocked"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "username": "string",
      "email": "string",
      "status": "string",
      "created_at": "string"
    }
  },
  "message": "User created successfully"
}
```

---

### 2.3 Benutzer aktualisieren
```http
PUT /api/users/{id}
```

**Verwendung:** `components/UserModal.vue`, `composables/useUserForm.js`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (optional)

**Request:**
```json
{
  "name": "string",
  "username": "string", // Kann nicht geändert werden
  "email": "string",
  "password": "string", // Optional bei Updates
  "role_id": "string",
  "status": "active" | "disabled" | "blocked"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "username": "string",
      "email": "string",
      "status": "string",
      "updated_at": "string"
    }
  },
  "message": "User updated successfully"
}
```

---

### 2.4 Benutzer löschen
```http
DELETE /api/users/{id}
```

**Verwendung:** `views/Users.vue`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (optional)

**Hinweis:** Nur für deaktivierte Benutzer verfügbar

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "User deleted successfully"
}
```

---

### 2.5 Benutzer-Berechtigungen abrufen
```http
GET /api/users/{id}/permissions
```

**Verwendung:** `components/UserModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "name": "user_role_assign",
        "display_name": "Assign User Roles"
      }
    ]
  }
}
```

---

## 3. Rollenverwaltung

### 3.1 Rollen auflisten
```http
GET /api/roles
```

**Verwendung:** `views/Roles.vue`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (optional)

**Query Parameter:**
- `page`: number (Standard: 1)
- `limit`: number (Standard: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "string",
        "name": "string",
        "display_name": "string",
        "description": "string",
        "is_system": false,
        "permissions": [
          {
            "id": "string",
            "name": "string",
            "display_name": "string"
          }
        ],
        "user_count": 5,
        "created_at": "string"
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 3,
      "total": 15
    }
  }
}
```

---

### 3.2 Zuweisbare Rollen abrufen
```http
GET /api/roles/assignable
```

**Verwendung:** `components/UserModal.vue`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "string",
        "name": "string",
        "display_name": "string"
      }
    ],
    "namespace": {
      "id": "string",
      "name": "string",
      "full_path": "string"
    }
  }
}
```

---

### 3.3 Einzelne Rolle abrufen
```http
GET /api/roles/{id}
```

**Verwendung:** `components/RoleModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "display_name": "string",
    "description": "string",
    "permissions": [
      {
        "id": "string",
        "name": "string"
      }
    ]
  }
}
```

---

### 3.4 Rolle erstellen
```http
POST /api/roles
```

**Verwendung:** `components/RoleModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "string",
  "display_name": "string",
  "description": "string",
  "permissions": ["permission-id-1", "permission-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "string",
      "name": "string",
      "display_name": "string",
      "description": "string"
    }
  },
  "message": "Role created successfully"
}
```

---

### 3.5 Rolle aktualisieren
```http
PUT /api/roles/{id}
```

**Verwendung:** `components/RoleModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "string",
  "display_name": "string",
  "description": "string",
  "permissions": ["permission-id-1", "permission-id-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role": {
      "id": "string",
      "name": "string",
      "display_name": "string",
      "description": "string"
    }
  },
  "message": "Role updated successfully"
}
```

---

### 3.6 Rolle löschen
```http
DELETE /api/roles/{id}
```

**Verwendung:** `views/Roles.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Hinweis:** Nur möglich, wenn keine Benutzer der Rolle zugewiesen sind

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Role deleted successfully"
}
```

---

## 4. Berechtigungen

### 4.1 Alle Berechtigungen abrufen
```http
GET /api/permissions
```

**Verwendung:** `components/RoleModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "string",
        "name": "string",
        "display_name": "string",
        "description": "string",
        "category": "string"
      }
    ]
  }
}
```

---

## 5. Namespace-Verwaltung

### 5.1 Namespaces auflisten (gefiltert)
```http
GET /api/namespaces
```

**Verwendung:** `views/Namespaces.vue`

**Headers:**
- `Authorization: Bearer {token}`
- `X-Namespace-ID: {namespace_id}` (filtert nach aktuellem Namespace-Bereich)

**Query Parameter:**
- `tree`: boolean (optional, für Baumstruktur)

**Response:**
```json
{
  "success": true,
  "data": {
    "namespaces": [
      {
        "id": "string",
        "name": "string",
        "full_path": "string",
        "domain": "string",
        "depth": 0,
        "parent_id": "string",
        "created_at": "string",
        "updated_at": "string"
      }
    ]
  }
}
```

---

### 5.2 Alle zugänglichen Namespaces auflisten
```http
GET /api/namespaces/list
```

**Verwendung:** `views/Namespaces.vue`, `components/NamespaceSelector.vue`

**Headers:**
- `Authorization: Bearer {token}`
- Kein X-Namespace-ID (keine Filterung)

**Response:**
```json
{
  "success": true,
  "data": {
    "namespaces": {
      "namespace-id-1": "root/child1",
      "namespace-id-2": "root/child2/grandchild"
    }
  }
}
```

---

### 5.3 Namespace erstellen
```http
POST /api/namespaces
```

**Verwendung:** `components/NamespaceModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "string",
  "domain": "string", // optional
  "parent_id": "string" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "namespace": {
      "id": "string",
      "name": "string",
      "full_path": "string",
      "domain": "string",
      "parent_id": "string"
    }
  },
  "message": "Namespace created successfully"
}
```

---

### 5.4 Namespace aktualisieren
```http
PATCH /api/namespaces/{id}
```

**Verwendung:** `components/NamespaceModal.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Request:**
```json
{
  "domain": "string" // Nur Domain kann aktualisiert werden
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "namespace": {
      "id": "string",
      "name": "string",
      "domain": "string"
    }
  },
  "message": "Namespace updated successfully"
}
```

---

### 5.5 Namespace löschen
```http
DELETE /api/namespaces/{id}
```

**Verwendung:** `views/Namespaces.vue`

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Namespace deleted successfully"
}
```

---

## Standard-Header

Alle authentifizierten Endpunkte verwenden:
- **Authorization**: `Bearer {token}` (JWT-Token aus localStorage)
- **Content-Type**: `application/json`
- **X-Namespace-ID**: `{namespace_id}` (optional, für namespace-spezifische Operationen)

---

## Standard-Response-Format

Alle Endpunkte folgen dieser Response-Struktur:
```json
{
  "success": boolean,
  "data": any,
  "message": "string",
  "errors": object // Bei Validierungsfehlern
}
```

---

## Fehlerbehandlung

### HTTP Status Codes:
- **200 OK**: Erfolgreiche Anfrage
- **400 Bad Request**: Ungültige Anfrage oder Validierungsfehler
- **401 Unauthorized**: Nicht autorisiert (Token ungültig/abgelaufen)
- **403 Forbidden**: Keine Berechtigung für diese Aktion
- **404 Not Found**: Ressource nicht gefunden
- **500 Internal Server Error**: Server-Fehler

### Frontend-Verhalten:
- **401**: Automatisches Entfernen des Tokens und Weiterleitung zur Login-Seite
- **Validierungsfehler**: Anzeige in Formularen mit feldspezifischen Fehlermeldungen
- **Netzwerkfehler**: Anzeige als generische Fehlermeldungen

---

## API-Client-Konfiguration

Der API-Client ist in `/frontend/src/utils/api.js` konfiguriert mit:
- **Base URL**: `/api`
- **Automatisches Token-Management** (localStorage)
- **Automatische Namespace-Header-Injection**
- **Fehlerabfangung und -behandlung**
- **Response-JSON-Parsing**

---

## Wichtige Implementierungshinweise

1. **Namespace-Bewusstsein**: Viele Endpunkte sind namespace-bewusst und verwenden den `X-Namespace-ID` Header
2. **Rollenhierarchie**: Das System respektiert Rollenhierarchien bei Zuweisungen
3. **Berechtigungsprüfungen**: Alle Aktionen werden gegen Benutzerberechtigungen validiert
4. **Multi-Tenancy**: Das System unterstützt vollständige Multi-Tenancy über Namespaces
5. **Validierung**: Umfassende Client- und Server-seitige Validierung mit Yup-Schemas