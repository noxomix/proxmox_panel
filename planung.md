# Namespace-Scoped Multi-Tenancy System

## AUFGABE
Bestehende Proxmox Panel App (Vue3 + Hono + MySQL) zu mandantenfähigem System erweitern. Jede Resource (User, Rollen) soll namespace-scoped werden für Multi-Tenant-Isolation.

## KERNLOGIK
- **User existiert nur in explizit zugewiesenen Namespaces** (via `user_namespace_roles` Records)
- **Rollen werden von Parent-Namespaces vererbt** - verfügbar in allen Sub-Namespaces, editierbar nur im Origin
- **Keine automatische Vererbung** für User-Zuweisungen - alle Zuweisungen sind bewusste, sichtbare DB-Records
- **Copy-Mechanismus** über UI für gewünschte "Vererbung" zu Sub-Namespaces
- **O(1) Performance** durch direkte DB-Lookups statt Rekursion

## DATENBANK-ÄNDERUNGEN

### Neue Tables
```sql
-- Haupt-Tabelle: User-Rolle pro Namespace (ersetzt bisherige user.role_id)
CREATE TABLE user_namespace_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    namespace_id UUID REFERENCES namespaces(id) ON DELETE RESTRICT, -- RESTRICT verhindert versehentliches Löschen
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT, -- RESTRICT für Datenintegrität
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, namespace_id)
);

-- Index für Performance
CREATE INDEX idx_unr_namespace_role ON user_namespace_roles(namespace_id, role_id);

-- Audit Log Tabelle für kritische Operationen
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    namespace_id UUID REFERENCES namespaces(id) ON DELETE SET NULL,
    target_type VARCHAR(50),
    target_id UUID,
    changes JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_namespace (namespace_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);
```

### Rollen-Tabelle erweitern
```sql
-- Roles bekommen Origin-Namespace für Vererbungslogik
ALTER TABLE roles ADD COLUMN origin_namespace_id UUID REFERENCES namespaces(id) ON DELETE RESTRICT;

-- Unique Constraint: Rollenname pro Namespace eindeutig
ALTER TABLE roles ADD CONSTRAINT unique_role_name_per_namespace 
  UNIQUE (name, origin_namespace_id);

-- Bestehende Rollen → Root-Namespace zuweisen
UPDATE roles SET origin_namespace_id = (SELECT id FROM namespaces WHERE parent_id IS NULL LIMIT 1);

-- Index für Performance
CREATE INDEX idx_roles_origin_namespace ON roles(origin_namespace_id);
```

## UI-WORKFLOWS

### Namespace-Creation
```
Admin erstellt "dept1" unter "company1"
→ Checkbox: "□ Parent-User übernehmen" 
→ Kopiert alle user_namespace_roles von company1 nach dept1
→ Rollen werden automatisch von Parent vererbt (verfügbar, aber nicht editierbar)
```

### User-Assignment  
```
Admin weist User zu "company1" zu
→ Rolle-Auswahl zeigt: company1-eigene + von Parent vererbte Rollen
→ Checkbox: "□ Zu Sub-Namespaces kopieren"
→ Erstellt Records für alle Sub-Namespaces
```

### Rollen-Management
```
Admin in "dept1" sieht:
├── Vererbte Rollen (grau, nur lesbar) ← von company1
└── Eigene Rollen (editierbar) ← origin_namespace_id = dept1

Admin kann nur Rollen bearbeiten mit origin_namespace_id = seinem Namespace
```

## PERMISSION-CHECK
```javascript
// O(1) Lookup statt Rekursion
function getUserRoleInNamespace(userId, namespaceId) {
    return db.query(`
        SELECT role_id FROM user_namespace_roles 
        WHERE user_id = ? AND namespace_id = ?
    `, [userId, namespaceId]);
    // null = User existiert nicht in diesem Namespace
}

// Verfügbare Rollen für Namespace (eigene + vererbte)
function getAvailableRoles(namespaceId) {
    return db.query(`
        SELECT r.* FROM roles r
        JOIN namespaces n ON r.origin_namespace_id IN (
            SELECT id FROM namespaces 
            WHERE id = ? OR ? = ANY(get_descendant_namespaces(id))
        )
    `, [namespaceId, namespaceId]);
    // Eigene Rollen + alle Parent-Rollen
}

// Kann User diese Rolle bearbeiten?
function canEditRole(userId, roleId, currentNamespaceId) {
    const role = db.query('SELECT origin_namespace_id FROM roles WHERE id = ?', [roleId]);
    return role.origin_namespace_id === currentNamespaceId;
}
```

## MIGRATION
1. **Neue Table erstellen** (user_namespace_roles)
2. **Rollen-Tabelle erweitern** (origin_namespace_id hinzufügen)
3. **Bestehende User → Root-Namespace migrieren** (alle user.role_id → user_namespace_roles)
4. **Bestehende Rollen → Root-Namespace zuweisen** (origin_namespace_id setzen)
5. **APIs erweitern** (namespace_id Parameter, backward compatible)
6. **Permission-Checks anpassen** (Namespace-Context + Rollen-Vererbung)

## TECHNISCHE DETAILS
- **Effektive Permissions** = Rolle-Permissions (nur über Rollen, keine direkten User-Permissions)
- **Backward Compatible** ohne namespace_id → Root-Namespace
- **"disabled" Rolle** für User ohne Rechte in bestimmten Namespaces
- **Cross-Tenant-Isolation** durch strikte Namespace-Trennung

---

# IMPLEMENTIERUNGS-ROADMAP

## PHASE 1: DATABASE SETUP (Non-Breaking)
**Ziel:** Datenbank-Schema erweitern ohne bestehende Funktionalität zu brechen

### 1.1 Migration erstellen
```bash
bunx knex migrate:make add_user_namespace_roles_and_role_origins
```

### 1.2 Exakte Migration-Datei erstellen
**Datei:** `migrations/XXXX_add_user_namespace_roles_and_role_origins.js`
```javascript
exports.up = function(knex) {
  return knex.schema
    // 1. Neue Junction-Table für User-Namespace-Rollen
    .createTable('user_namespace_roles', function(table) {
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('namespace_id').references('id').inTable('namespaces').onDelete('CASCADE');
      table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.primary(['user_id', 'namespace_id']);
      
      // Performance Indexes
      table.index('user_id', 'idx_user_namespace_roles_user');
      table.index('namespace_id', 'idx_user_namespace_roles_namespace');
      table.index('role_id', 'idx_user_namespace_roles_role');
    })
    // 2. Rollen-Tabelle um Origin-Namespace erweitern
    .alterTable('roles', function(table) {
      table.uuid('origin_namespace_id').references('id').inTable('namespaces');
      table.index('origin_namespace_id', 'idx_roles_origin_namespace');
    })
    .then(() => {
      // 3. Daten-Migration: Bestehende User → Root-Namespace
      return knex.raw(`
        INSERT INTO user_namespace_roles (user_id, namespace_id, role_id)
        SELECT u.id, n.id, u.role_id 
        FROM users u, namespaces n
        WHERE n.parent_id IS NULL AND u.role_id IS NOT NULL
      `);
    })
    .then(() => {
      // 4. Daten-Migration: Bestehende Rollen → Root-Namespace
      return knex.raw(`
        UPDATE roles SET origin_namespace_id = (
          SELECT id FROM namespaces WHERE parent_id IS NULL LIMIT 1
        )
      `);
    });
};

exports.down = function(knex) {
  // 1. Backup der aktuellen user_namespace_roles für Wiederherstellung
  return knex.raw(`
    CREATE TEMPORARY TABLE _backup_user_roles AS
    SELECT unr.user_id, unr.role_id
    FROM user_namespace_roles unr
    JOIN namespaces n ON unr.namespace_id = n.id
    WHERE n.parent_id IS NULL
  `)
  .then(() => {
    // 2. User.role_id aus Backup wiederherstellen
    return knex.raw(`
      UPDATE users u
      SET role_id = b.role_id
      FROM _backup_user_roles b
      WHERE u.id = b.user_id
    `);
  })
  .then(() => {
    // 3. Tabellen-Änderungen rückgängig machen
    return knex.schema
      .dropTable('user_namespace_roles')
      .alterTable('roles', function(table) {
        table.dropColumn('origin_namespace_id');
      });
  })
  .then(() => {
    // 4. Temporary table cleanup
    return knex.raw('DROP TABLE IF EXISTS _backup_user_roles');
  });
};
```

### 1.3 Migration ausführen und validieren
```bash
# Migration ausführen
bunx knex migrate:latest

# Validierung: Daten-Integrität prüfen
bunx knex seed:run --specific=validate_migration.js
```

### 1.4 Dateien erstellt:
- `migrations/XXXX_add_user_namespace_roles_and_role_origins.js` ✅ NEU
- `seeds/validate_migration.js` ✅ NEU (Validierungs-Script)

### 1.5 Erfolgskriterien:
- ✅ Bestehende APIs funktionieren unverändert
- ✅ Alle User haben user_namespace_roles Records
- ✅ Alle Rollen haben origin_namespace_id
- ✅ Keine Foreign Key Violations

## PHASE 2: MODELS ERWEITERN (Backward Compatible)
**Ziel:** Models um exakte Namespace-Funktionen erweitern, alte APIs 100% funktionsfähig

### 2.1 User Model erweitern (`src/models/User.js`)

**Neue statische Methoden hinzufügen:**
```javascript
// 1. Namespace-aware User-Abfragen mit Paginierung
static async findByNamespace(namespaceId, options = {}) {
  const { page = 1, limit = 50, search = '', sortBy = 'created_at', order = 'desc' } = options;
  
  return await db('users as u')
    .join('user_namespace_roles as unr', 'u.id', 'unr.user_id')
    .join('roles as r', 'unr.role_id', 'r.id')
    .where('unr.namespace_id', namespaceId)
    .where(function() {
      if (search) {
        this.where('u.username', 'like', `%${search}%`)
            .orWhere('u.email', 'like', `%${search}%`)
            .orWhere('u.first_name', 'like', `%${search}%`)
            .orWhere('u.last_name', 'like', `%${search}%`);
      }
    })
    .select('u.*', 'r.name as role_name', 'r.display_name as role_display_name')
    .orderBy(sortBy, order)
    .paginate({ perPage: limit, currentPage: page });
}

// 2. O(1) Role-Lookup für spezifischen Namespace
static async getRoleInNamespace(userId, namespaceId) {
  const result = await db('user_namespace_roles as unr')
    .join('roles as r', 'unr.role_id', 'r.id')
    .where({ 'unr.user_id': userId, 'unr.namespace_id': namespaceId })
    .select('r.*')
    .first();
  
  return result || null;
}

// 3. User zu Namespace mit Rolle zuweisen (mit Validation)
static async assignToNamespace(userId, namespaceId, roleId, options = {}) {
  const { copyToSubNamespaces = false, replaceExisting = false } = options;
  
  // Validierung: User, Namespace und Role existieren
  const user = await User.findById(userId);
  const namespace = await Namespace.findById(namespaceId);
  const role = await Role.findById(roleId);
  
  if (!user || !namespace || !role) {
    throw new Error('User, Namespace or Role not found');
  }
  
  // Validierung: Role ist im Namespace verfügbar
  const availableRoles = await Role.findByNamespace(namespaceId);
  if (!availableRoles.find(r => r.id === roleId)) {
    throw new Error('Role not available in this namespace');
  }
  
  await db.transaction(async (trx) => {
    // Bestehende Zuweisung entfernen falls gewünscht
    if (replaceExisting) {
      await trx('user_namespace_roles')
        .where({ user_id: userId, namespace_id: namespaceId })
        .del();
    }
    
    // Neue Zuweisung erstellen
    await trx('user_namespace_roles').insert({
      user_id: userId,
      namespace_id: namespaceId,
      role_id: roleId,
      created_at: new Date()
    });
    
    // Optional: Zu Sub-Namespaces kopieren
    if (copyToSubNamespaces) {
      const subNamespaces = await Namespace.findDescendants(namespaceId);
      for (const subNs of subNamespaces) {
        await trx('user_namespace_roles')
          .insert({
            user_id: userId,
            namespace_id: subNs.id,
            role_id: roleId,
            created_at: new Date()
          })
          .onConflict(['user_id', 'namespace_id'])
          .ignore(); // Skip falls bereits vorhanden
      }
    }
  });
}

// 4. User aus Namespace entfernen
static async removeFromNamespace(userId, namespaceId, options = {}) {
  const { removeFromSubNamespaces = false } = options;
  
  await db.transaction(async (trx) => {
    // Aus Namespace entfernen
    await trx('user_namespace_roles')
      .where({ user_id: userId, namespace_id: namespaceId })
      .del();
    
    // Optional: Auch aus Sub-Namespaces entfernen
    if (removeFromSubNamespaces) {
      const subNamespaces = await Namespace.findDescendants(namespaceId);
      for (const subNs of subNamespaces) {
        await trx('user_namespace_roles')
          .where({ user_id: userId, namespace_id: subNs.id })
          .del();
      }
    }
  });
}

// 5. Alle Namespaces eines Users abrufen
static async getNamespaces(userId) {
  return await db('user_namespace_roles as unr')
    .join('namespaces as n', 'unr.namespace_id', 'n.id')
    .join('roles as r', 'unr.role_id', 'r.id')
    .where('unr.user_id', userId)
    .select('n.*', 'r.name as role_name', 'r.display_name as role_display_name')
    .orderBy('n.name');
}
```

**Bestehende Methoden erweitern (Backward Compatible):**
```javascript
// hasPermission() um Namespace-Kontext erweitern (KEINE circular dependency!)
async hasPermission(permissionName, namespaceId = null) {
  // Falls namespaceId null → verwende cached root namespace ID
  if (!namespaceId) {
    // Cache root namespace ID um wiederholte Lookups zu vermeiden
    if (!this._rootNamespaceId) {
      const rootNamespace = await Namespace.findRoot();
      this._rootNamespaceId = rootNamespace.id;
    }
    namespaceId = this._rootNamespaceId;
  }
  
  // Direkte Query ohne weitere Model-Methoden (verhindert circular dependency)
  const result = await db('user_namespace_roles as unr')
    .join('role_permissions as rp', 'unr.role_id', 'rp.role_id')
    .join('permissions as p', 'rp.permission_id', 'p.id')
    .where({
      'unr.user_id': this.id,
      'unr.namespace_id': namespaceId,
      'p.name': permissionName
    })
    .first();
  
  return !!result;
}

// getRole() erweitern für Namespace-Kontext
async getRole(namespaceId = null) {
  if (!namespaceId) {
    // Backward Compatible: Root-Namespace
    const rootNamespace = await Namespace.findRoot();
    namespaceId = rootNamespace.id;
  }
  
  return await User.getRoleInNamespace(this.id, namespaceId);
}
```

### 2.2 Role Model erweitern (`src/models/Role.js`)

**Neue statische Methoden:**
```javascript
// 1. Verfügbare Rollen für Namespace (eigene + vererbte)
static async findByNamespace(namespaceId) {
  // Alle Ancestor-Namespaces ermitteln (inklusive selbst)
  const ancestorIds = await Namespace.getAncestorIds(namespaceId);
  
  return await db('roles')
    .whereIn('origin_namespace_id', ancestorIds)
    .orderBy('display_name');
}

// 2. Nur editierbare Rollen für Namespace
static async findEditableByNamespace(namespaceId) {
  return await db('roles')
    .where('origin_namespace_id', namespaceId)
    .orderBy('display_name');
}

// 3. Kann Rolle in Namespace editiert werden?
static async canEdit(roleId, namespaceId) {
  const role = await db('roles')
    .where('id', roleId)
    .first();
  
  if (!role) return false;
  
  // Nur in Origin-Namespace editierbar
  return role.origin_namespace_id === namespaceId;
}

// 4. Rolle in neuem Namespace erstellen
static async createInNamespace(roleData, namespaceId) {
  const { name, display_name, description, permissions = [] } = roleData;
  
  return await db.transaction(async (trx) => {
    // Role erstellen
    const [roleId] = await trx('roles').insert({
      id: generateUUID(),
      name,
      display_name,
      description,
      origin_namespace_id: namespaceId,
      is_system: false,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Permissions zuweisen
    if (permissions.length > 0) {
      const rolePermissions = permissions.map(permId => ({
        role_id: roleId,
        permission_id: permId
      }));
      await trx('role_permissions').insert(rolePermissions);
    }
    
    return await Role.findById(roleId);
  });
}
```

### 2.3 Namespace Model erweitern (`src/models/Namespace.js`)

**Neue Methoden:**
```javascript
// 1. Root-Namespace finden
static async findRoot() {
  return await db('namespaces')
    .whereNull('parent_id')
    .first();
}

// 2. Alle Ancestor-IDs (Parent-Kette nach oben) - MIT CTE!
static async getAncestorIds(namespaceId) {
  // MySQL 8.0+ unterstützt CTEs
  const result = await db.raw(`
    WITH RECURSIVE ancestors AS (
      -- Basis: Start-Namespace
      SELECT id, parent_id, 0 as level
      FROM namespaces 
      WHERE id = ?
      
      UNION ALL
      
      -- Rekursion: Parent-Namespaces
      SELECT n.id, n.parent_id, a.level + 1
      FROM namespaces n
      INNER JOIN ancestors a ON n.id = a.parent_id
    )
    SELECT id FROM ancestors ORDER BY level
  `, [namespaceId]);
  
  return result[0].map(row => row.id);
}

// 3. Alle Descendant-Namespaces (Kinder-Baum nach unten) - MIT CTE!
static async findDescendants(namespaceId) {
  const result = await db.raw(`
    WITH RECURSIVE descendants AS (
      -- Basis: Start-Namespace (nicht inkludiert in Results)
      SELECT id, parent_id, 0 as level
      FROM namespaces 
      WHERE parent_id = ?
      
      UNION ALL
      
      -- Rekursion: Kind-Namespaces
      SELECT n.id, n.parent_id, d.level + 1
      FROM namespaces n
      INNER JOIN descendants d ON n.parent_id = d.id
    )
    SELECT * FROM descendants ORDER BY level, name
  `, [namespaceId]);
  
  return result[0];
}

// Optimierte Methode: Prüfe ob Namespace A Ancestor von B ist
static async isAncestorOf(ancestorId, descendantId) {
  const result = await db.raw(`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id
      FROM namespaces 
      WHERE id = ?
      
      UNION ALL
      
      SELECT n.id, n.parent_id
      FROM namespaces n
      INNER JOIN ancestors a ON n.id = a.parent_id
      WHERE a.id != ?  -- Stop wenn Ziel erreicht
    )
    SELECT COUNT(*) as is_ancestor 
    FROM ancestors 
    WHERE id = ?
  `, [descendantId, ancestorId, ancestorId]);
  
  return result[0][0].is_ancestor > 0;
}

// 4. User-Count für Namespace
async getUserCount() {
  const result = await db('user_namespace_roles')
    .where('namespace_id', this.id)
    .count('user_id as count')
    .first();
  
  return parseInt(result.count) || 0;
}
```

### 2.4 Dateien geändert:
- ✅ `src/models/User.js` (ERWEITERT mit 5 neuen Methoden + 2 erweiterte)
- ✅ `src/models/Role.js` (ERWEITERT mit 4 neuen Methoden)
- ✅ `src/models/Namespace.js` (ERWEITERT mit 4 neuen Methoden)

### 2.5 Audit Logger erstellen (`src/utils/auditLogger.js`)

**Audit Logging für kritische Operationen:**
```javascript
import { db } from '../db.js';

class AuditLogger {
  async log(action, data, context = {}) {
    try {
      const { user, namespace, request } = context;
      
      const auditEntry = {
        id: crypto.randomUUID(),
        action,
        user_id: user?.id || data.user_id || null,
        namespace_id: namespace?.id || data.namespace_id || null,
        target_type: this.extractTargetType(action),
        target_id: data.target_id || this.extractTargetId(data),
        changes: JSON.stringify(data),
        ip_address: request?.ip || null,
        user_agent: request?.headers?.['user-agent'] || null,
        created_at: new Date()
      };
      
      await db('audit_logs').insert(auditEntry);
      
      // Critical actions also go to system log
      if (this.isCriticalAction(action)) {
        console.log(`[AUDIT-CRITICAL] ${action}`, {
          user: user?.username,
          namespace: namespace?.name,
          ...data
        });
      }
      
    } catch (error) {
      // Don't fail operations due to audit logging errors
      console.error('[AUDIT-ERROR]', error);
    }
  }
  
  extractTargetType(action) {
    const [resource] = action.split('.');
    return resource;
  }
  
  extractTargetId(data) {
    return data.user_id || data.role_id || data.namespace_id || 
           data.target_user_id || data.deleted_id || null;
  }
  
  isCriticalAction(action) {
    const critical = [
      'namespace.deleted',
      'role.permissions_changed',
      'user.role_elevated',
      'user.cross_namespace_assignment',
      'security.permission_bypass_attempt'
    ];
    return critical.includes(action);
  }
  
  // Middleware helper für Express/Hono
  middleware() {
    return async (c, next) => {
      const startTime = Date.now();
      const method = c.req.method;
      const path = c.req.path;
      
      await next();
      
      const duration = Date.now() - startTime;
      
      // Log only mutation operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const user = c.get('user');
        const namespace = c.get('namespace');
        
        await this.log(`api.${method.toLowerCase()}`, {
          path,
          status: c.res.status,
          duration_ms: duration
        }, { user, namespace, request: c.req });
      }
    };
  }
}

export const auditLogger = new AuditLogger();
```

### 2.6 Erfolgskriterien:
- ✅ Alle bestehenden API-Calls funktionieren unverändert
- ✅ Neue Namespace-Methoden sind vollständig implementiert
- ✅ Performance: O(1) Lookups für User-Role-Namespace
- ✅ Transaction-Sicherheit bei Multi-Namespace-Operationen
- ✅ Audit Logging für alle kritischen Operationen

## PHASE 3: MIDDLEWARE & UTILITIES
**Ziel:** Namespace-Context für alle Requests bereitstellen und Permission-Logik erweitern

### 3.0 JWT Utils erweitern (`src/utils/jwt.js`)

**JWT mit Namespace-Context für bessere Security:**
```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// JWT mit erweitertem Payload generieren
export const generateToken = async (payload, options = {}) => {
  const { 
    userId, 
    namespaceId = null,
    sessionId = crypto.randomUUID() // Unique session ID
  } = payload;
  
  if (!userId) throw new Error('userId required for token generation');
  
  // Extended Payload mit Security-Context
  const tokenPayload = {
    userId,
    namespaceId, // Optional: spezifischer Namespace-Lock
    sessionId, // Für Session-Invalidation
    iat: Math.floor(Date.now() / 1000),
    fingerprint: options.fingerprint || null // Browser fingerprint
  };
  
  return jwt.sign(tokenPayload, JWT_SECRET, { 
    expiresIn: options.expiresIn || JWT_EXPIRES_IN,
    issuer: 'proxmox-panel',
    audience: options.audience || 'web'
  });
};

// Token mit erweiterter Validierung verifizieren
export const verifyToken = async (token, options = {}) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'proxmox-panel',
      audience: options.audience || 'web'
    });
    
    // Session-Validierung
    if (options.validateSession) {
      const isValidSession = await validateSession(decoded.sessionId, decoded.userId);
      if (!isValidSession) {
        throw new Error('Invalid or expired session');
      }
    }
    
    // Namespace-Lock Validierung
    if (decoded.namespaceId && options.namespaceId) {
      if (decoded.namespaceId !== options.namespaceId) {
        throw new Error('Token locked to different namespace');
      }
    }
    
    return decoded;
  } catch (error) {
    throw new Error(`Token validation failed: ${error.message}`);
  }
};

// Session Management für Token-Invalidation
const validateSession = async (sessionId, userId) => {
  // Check Redis/DB for valid session
  const session = await redis.get(`session:${userId}:${sessionId}`);
  return !!session;
};
```

### 3.1 Namespace Middleware erstellen (`src/middleware/namespace.js`)

**Komplette Datei erstellen:**
```javascript
import { User, Namespace } from '../models/index.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Namespace-Context für Request bereitstellen
 * Setzt c.set('namespaceId') und c.set('namespace')
 */
export const namespaceMiddleware = async (c, next) => {
  try {
    const user = c.get('user'); // Aus auth middleware
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 1. Namespace-ID aus verschiedenen Quellen ermitteln
    let namespaceId = 
      c.req.header('X-Namespace-ID') ||           // Header (Frontend)
      c.req.query('namespace_id') ||              // Query Parameter (API)
      c.req.json?.namespace_id ||                 // Body (POST/PUT)
      null;

    // 2. Falls nicht angegeben → User's Default Namespace (mit Permission-Check!)
    if (!namespaceId) {
      const userNamespaces = await User.getNamespaces(user.id);
      if (userNamespaces.length === 0) {
        throw new Error('User has no namespace access');
      }
      
      // Wähle erstes Namespace mit mindestens View-Permission
      let defaultNamespace = null;
      for (const ns of userNamespaces) {
        const hasBasicPermission = await user.hasPermission('users_list', ns.id) ||
                                  await user.hasPermission('namespaces_view', ns.id);
        if (hasBasicPermission) {
          defaultNamespace = ns;
          break;
        }
      }
      
      if (!defaultNamespace) {
        throw new Error('User has no namespace with sufficient permissions');
      }
      
      namespaceId = defaultNamespace.id;
    }

    // 3. Namespace-Zugriff validieren
    const userRole = await User.getRoleInNamespace(user.id, namespaceId);
    if (!userRole) {
      return c.json({ 
        error: 'Access denied', 
        message: `No access to namespace ${namespaceId}` 
      }, 403);
    }

    // 4. Namespace-Objekt laden
    const namespace = await Namespace.findById(namespaceId);
    if (!namespace) {
      return c.json({ 
        error: 'Namespace not found', 
        message: `Namespace ${namespaceId} does not exist` 
      }, 404);
    }

    // 5. Context setzen
    c.set('namespaceId', namespaceId);
    c.set('namespace', namespace);
    c.set('userRole', userRole); // Role des Users in diesem Namespace

    await next();
  } catch (error) {
    return ErrorHandler.handle(c, error, 'Namespace middleware error');
  }
};

/**
 * Optional Namespace Middleware (für Backward Compatibility)
 * Erlaubt Requests ohne Namespace → Root-Namespace
 */
export const optionalNamespaceMiddleware = async (c, next) => {
  try {
    const user = c.get('user');
    if (!user) {
      await next();
      return;
    }

    let namespaceId = 
      c.req.header('X-Namespace-ID') || 
      c.req.query('namespace_id');

    if (!namespaceId) {
      // Kein Namespace → Root verwenden (Backward Compatible)
      const rootNamespace = await Namespace.findRoot();
      namespaceId = rootNamespace?.id;
    }

    if (namespaceId) {
      const userRole = await User.getRoleInNamespace(user.id, namespaceId);
      if (userRole) {
        const namespace = await Namespace.findById(namespaceId);
        c.set('namespaceId', namespaceId);
        c.set('namespace', namespace);
        c.set('userRole', userRole);
      }
    }

    await next();
  } catch (error) {
    await next(); // Bei Fehlern einfach weiter (optional middleware)
  }
};
```

### 3.2 Permission Helper erweitern (`src/utils/permissionHelper.js`)

**Bestehende Datei erweitern:**
```javascript
// Bestehende canManageUser() um Namespace-Grenzen erweitern
static async canManageUser(managerId, targetUserId, namespaceId) {
  // 1. Prüfe ob Manager permissions hat
  const managerRole = await User.getRoleInNamespace(managerId, namespaceId);
  if (!managerRole) return false;
  
  const hasUserManagePermission = await managerRole.hasPermission('users_edit');
  if (!hasUserManagePermission) return false;
  
  // 2. Prüfe ob Target-User im gleichen Namespace existiert
  const targetRole = await User.getRoleInNamespace(targetUserId, namespaceId);
  if (!targetRole) return false;
  
  // 3. Prüfe Role-Hierarchie (Manager muss höhere Rolle haben)
  const managerLevel = await this.getRoleHierarchyLevel(managerRole.name);
  const targetLevel = await this.getRoleHierarchyLevel(targetRole.name);
  
  return managerLevel < targetLevel; // Niedrigere Zahl = höhere Berechtigung
}

// Neue Rollen-Management Permissions
static async canManageRole(managerId, roleId, namespaceId) {
  // 1. Prüfe ob Manager roles_edit Permission hat
  const managerRole = await User.getRoleInNamespace(managerId, namespaceId);
  if (!managerRole) return false;
  
  const hasRoleEditPermission = await managerRole.hasPermission('roles_edit');
  if (!hasRoleEditPermission) return false;
  
  // 2. Prüfe ob Rolle im Manager's Namespace editierbar ist
  const canEdit = await Role.canEdit(roleId, namespaceId);
  if (!canEdit) return false;
  
  // 3. Prüfe Permission-Subset-Regel
  const role = await Role.findById(roleId);
  const rolePermissions = await role.getPermissions();
  const managerPermissions = await managerRole.getPermissions();
  
  // Manager muss alle Permissions haben, die er der Rolle geben will
  const managerPermissionNames = managerPermissions.map(p => p.name);
  const rolePermissionNames = rolePermissions.map(p => p.name);
  
  return rolePermissionNames.every(perm => managerPermissionNames.includes(perm));
}

// Neue Namespace-Permission Checks
static async canManageNamespace(managerId, namespaceId) {
  const managerRole = await User.getRoleInNamespace(managerId, namespaceId);
  if (!managerRole) return false;
  
  return await managerRole.hasPermission('namespaces_edit');
}

static async canViewNamespace(userId, namespaceId) {
  const userRole = await User.getRoleInNamespace(userId, namespaceId);
  return !!userRole; // User hat Zugriff wenn er eine Rolle im Namespace hat
}

// Namespace-Hierarchie Permission Check
static async canAccessParentNamespace(userId, childNamespaceId) {
  const childNamespace = await Namespace.findById(childNamespaceId);
  if (!childNamespace?.parent_id) return false;
  
  return await this.canViewNamespace(userId, childNamespace.parent_id);
}
```

### 3.3 Route-Schutz erweitern (`src/middleware/permissions.js`)

**Namespace-aware Permission Checks hinzufügen:**
```javascript
// Neue Middleware: Erfordert spezifische Permission in aktuellem Namespace
export const requireNamespacePermission = (permissionName) => {
  return async (c, next) => {
    const user = c.get('user');
    const namespaceId = c.get('namespaceId');
    const userRole = c.get('userRole');
    
    if (!user || !namespaceId || !userRole) {
      return c.json({ error: 'Authentication or namespace context required' }, 401);
    }
    
    const hasPermission = await userRole.hasPermission(permissionName);
    if (!hasPermission) {
      return c.json({ 
        error: 'Insufficient permissions', 
        required: permissionName,
        namespace: namespaceId 
      }, 403);
    }
    
    await next();
  };
};

// Middleware: Erfordert Rollen-Edit-Berechtigung für spezifische Rolle
export const requireRoleEditPermission = async (c, next) => {
  const user = c.get('user');
  const namespaceId = c.get('namespaceId');
  const roleId = c.req.param('roleId') || c.req.json?.role_id;
  
  if (!roleId) {
    return c.json({ error: 'Role ID required' }, 400);
  }
  
  const canManage = await PermissionHelper.canManageRole(user.id, roleId, namespaceId);
  if (!canManage) {
    return c.json({ 
      error: 'Cannot edit this role',
      reason: 'Role not editable in current namespace or insufficient permissions'
    }, 403);
  }
  
  await next();
};
```

### 3.4 Dateien geändert:
- ✅ `src/middleware/namespace.js` (NEU - 80 Zeilen)
- ✅ `src/utils/permissionHelper.js` (ERWEITERT mit 6 neuen Methoden)
- ✅ `src/middleware/permissions.js` (ERWEITERT mit 2 neuen Middlewares)

### 3.5 Erfolgskriterien:
- ✅ Namespace-Context ist in allen geschützten Routes verfügbar
- ✅ Automatic fallback auf Root-Namespace für Backward Compatibility
- ✅ Permission-Checks berücksichtigen Namespace-Kontext
- ✅ Rollen-Vererbung funktioniert korrekt
- ✅ Fehlerbehandlung für ungültige Namespace-Zugriffe

## PHASE 4: CONTROLLERS ANPASSEN
**Ziel:** API-Endpoints vollständig um Namespace-Support erweitern mit detaillierter Implementierung

### 4.1 UserController erweitern (`src/controllers/UserController.js`)

**Alle Endpoints exakt implementieren:**
```javascript
// GET /users - Namespace-gefilterte User-Liste
async getUsers(c) {
  try {
    const namespaceId = c.get('namespaceId');
    const user = c.get('user');
    
    // Permission Check
    const hasPermission = await user.hasPermission('users_list', namespaceId);
    if (!hasPermission) {
      return c.json({ error: 'Permission denied' }, 403);
    }
    
    // Query Parameters
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 50;
    const search = c.req.query('search') || '';
    const sortBy = c.req.query('sortBy') || 'created_at';
    const order = c.req.query('order') || 'desc';
    
    // Users aus Namespace abrufen
    const result = await User.findByNamespace(namespaceId, {
      page, limit, search, sortBy, order
    });
    
    return c.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.pagination.page,
        pages: result.pagination.pages,
        perPage: result.pagination.perPage,
        total: result.pagination.total
      },
      namespace: {
        id: namespaceId,
        name: c.get('namespace').name
      }
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// POST /users - User in Namespace erstellen
async createUser(c) {
  try {
    const namespaceId = c.get('namespaceId');
    const requestUser = c.get('user');
    const userData = await c.req.json();
    
    // Permission Check
    const hasPermission = await requestUser.hasPermission('users_create', namespaceId);
    if (!hasPermission) {
      return c.json({ error: 'Permission denied' }, 403);
    }
    
    // Validierung
    const { username, email, first_name, last_name, password, role_id, copy_to_sub_namespaces = false } = userData;
    
    if (!username || !email || !password || !role_id) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Prüfe ob Rolle im Namespace verfügbar ist
    const availableRoles = await Role.findByNamespace(namespaceId);
    const role = availableRoles.find(r => r.id === role_id);
    if (!role) {
      return c.json({ error: 'Role not available in this namespace' }, 400);
    }
    
    // Permission-Hierarchie prüfen (User kann nur niedrigere Rollen zuweisen)
    const canAssignRole = await PermissionHelper.canAssignRole(requestUser.id, role_id, namespaceId);
    if (!canAssignRole) {
      return c.json({ error: 'Cannot assign this role (hierarchy violation)' }, 403);
    }
    
    // User erstellen
    const newUser = await User.create({
      username,
      email,
      first_name,
      last_name,
      password
    });
    
    // Zu Namespace(s) zuweisen
    await User.assignToNamespace(newUser.id, namespaceId, role_id, {
      copyToSubNamespaces: copy_to_sub_namespaces
    });
    
    // Response mit Namespace-Info
    const userWithRole = await User.findById(newUser.id);
    const userRole = await User.getRoleInNamespace(newUser.id, namespaceId);
    
    return c.json({
      success: true,
      data: {
        ...userWithRole,
        role: userRole,
        namespace_id: namespaceId
      },
      message: 'User created successfully'
    }, 201);
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// PUT /users/:userId - User in Namespace updaten
async updateUser(c) {
  try {
    const { userId } = c.req.param();
    const namespaceId = c.get('namespaceId');
    const requestUser = c.get('user');
    const updateData = await c.req.json();
    
    // Permission Checks
    const canManage = await PermissionHelper.canManageUser(requestUser.id, userId, namespaceId);
    if (!canManage) {
      return c.json({ error: 'Cannot manage this user' }, 403);
    }
    
    // User muss im Namespace existieren
    const targetUserRole = await User.getRoleInNamespace(userId, namespaceId);
    if (!targetUserRole) {
      return c.json({ error: 'User not found in this namespace' }, 404);
    }
    
    // User-Daten updaten
    const { username, email, first_name, last_name, role_id } = updateData;
    const updatedUser = await User.update(userId, {
      username, email, first_name, last_name
    });
    
    // Rolle ändern falls angegeben
    if (role_id && role_id !== targetUserRole.id) {
      // Neue Rolle validieren
      const availableRoles = await Role.findByNamespace(namespaceId);
      const newRole = availableRoles.find(r => r.id === role_id);
      if (!newRole) {
        return c.json({ error: 'New role not available in this namespace' }, 400);
      }
      
      const canAssignRole = await PermissionHelper.canAssignRole(requestUser.id, role_id, namespaceId);
      if (!canAssignRole) {
        return c.json({ error: 'Cannot assign this role' }, 403);
      }
      
      // Rolle ändern
      await User.assignToNamespace(userId, namespaceId, role_id, { replaceExisting: true });
    }
    
    return c.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// DELETE /users/:userId - User aus Namespace entfernen
async deleteUser(c) {
  try {
    const { userId } = c.req.param();
    const namespaceId = c.get('namespaceId');
    const requestUser = c.get('user');
    
    // Permission Checks
    const canManage = await PermissionHelper.canManageUser(requestUser.id, userId, namespaceId);
    if (!canManage) {
      return c.json({ error: 'Cannot manage this user' }, 403);
    }
    
    // Selbst-Löschung verhindern
    if (userId === requestUser.id) {
      return c.json({ error: 'Cannot delete yourself' }, 400);
    }
    
    // User aus Namespace entfernen (nicht komplett löschen)
    await User.removeFromNamespace(userId, namespaceId);
    
    return c.json({
      success: true,
      message: 'User removed from namespace'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// POST /users/:userId/assign-namespace - User zu weiterem Namespace zuweisen
async assignUserToNamespace(c) {
  try {
    const { userId } = c.req.param();
    const requestUser = c.get('user');
    const { target_namespace_id, role_id, copy_to_sub_namespaces = false } = await c.req.json();
    
    // Permission Checks für Ziel-Namespace
    const canManageTarget = await PermissionHelper.canManageUser(requestUser.id, userId, target_namespace_id);
    if (!canManageTarget) {
      return c.json({ error: 'Cannot assign user to target namespace' }, 403);
    }
    
    await User.assignToNamespace(userId, target_namespace_id, role_id, {
      copyToSubNamespaces: copy_to_sub_namespaces
    });
    
    return c.json({
      success: true,
      message: 'User assigned to namespace'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}
```

### 4.2 RoleController erweitern (`src/controllers/RoleController.js`)

**Vollständige Namespace-aware Implementierung:**
```javascript
// GET /roles - Namespace-verfügbare Rollen anzeigen
async getRoles(c) {
  try {
    const namespaceId = c.get('namespaceId');
    const user = c.get('user');
    
    // Permission Check
    const hasPermission = await user.hasPermission('roles_list', namespaceId);
    if (!hasPermission) {
      return c.json({ error: 'Permission denied' }, 403);
    }
    
    // Alle verfügbaren Rollen (eigene + vererbte)
    const allRoles = await Role.findByNamespace(namespaceId);
    
    // Nur editierbare Rollen (eigene)
    const editableRoles = await Role.findEditableByNamespace(namespaceId);
    const editableRoleIds = editableRoles.map(r => r.id);
    
    // Response mit Edit-Info
    const rolesWithMeta = allRoles.map(role => ({
      ...role,
      editable: editableRoleIds.includes(role.id),
      inherited: role.origin_namespace_id !== namespaceId,
      origin_namespace: role.origin_namespace_id
    }));
    
    return c.json({
      success: true,
      data: rolesWithMeta,
      namespace: {
        id: namespaceId,
        name: c.get('namespace').name
      }
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// POST /roles - Neue Rolle in Namespace erstellen
async createRole(c) {
  try {
    const namespaceId = c.get('namespaceId');
    const user = c.get('user');
    const roleData = await c.req.json();
    
    // Permission Check
    const hasPermission = await user.hasPermission('roles_create', namespaceId);
    if (!hasPermission) {
      return c.json({ error: 'Permission denied' }, 403);
    }
    
    const { name, display_name, description, permissions = [] } = roleData;
    
    // Validierung
    if (!name || !display_name) {
      return c.json({ error: 'Name and display_name are required' }, 400);
    }
    
    // Prüfe ob User alle Permissions hat, die er zuweisen will
    const userRole = c.get('userRole');
    const userPermissions = await userRole.getPermissions();
    const userPermissionNames = userPermissions.map(p => p.name);
    
    const requestedPermissions = await Permission.findByIds(permissions);
    const requestedPermissionNames = requestedPermissions.map(p => p.name);
    
    const hasAllPermissions = requestedPermissionNames.every(perm => 
      userPermissionNames.includes(perm)
    );
    
    if (!hasAllPermissions) {
      return c.json({ 
        error: 'Cannot assign permissions you do not have',
        missing: requestedPermissionNames.filter(p => !userPermissionNames.includes(p))
      }, 403);
    }
    
    // Rolle erstellen
    const newRole = await Role.createInNamespace({
      name,
      display_name,
      description,
      permissions
    }, namespaceId);
    
    return c.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    }, 201);
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// PUT /roles/:roleId - Rolle bearbeiten (nur origin_namespace_id)
async updateRole(c) {
  try {
    const { roleId } = c.req.param();
    const namespaceId = c.get('namespaceId');
    const user = c.get('user');
    const updateData = await c.req.json();
    
    // Permission Checks
    const canManage = await PermissionHelper.canManageRole(user.id, roleId, namespaceId);
    if (!canManage) {
      return c.json({ 
        error: 'Cannot edit this role',
        reason: 'Role not editable in current namespace or insufficient permissions'
      }, 403);
    }
    
    // System-Rollen schützen
    const role = await Role.findById(roleId);
    if (role.is_system) {
      return c.json({ error: 'Cannot edit system roles' }, 403);
    }
    
    const { display_name, description, permissions } = updateData;
    
    // Rolle updaten
    const updatedRole = await Role.update(roleId, {
      display_name,
      description
    });
    
    // Permissions updaten falls angegeben
    if (permissions) {
      // Permission-Validierung (wie bei create)
      const userRole = c.get('userRole');
      const userPermissions = await userRole.getPermissions();
      const userPermissionNames = userPermissions.map(p => p.name);
      
      const requestedPermissions = await Permission.findByIds(permissions);
      const requestedPermissionNames = requestedPermissions.map(p => p.name);
      
      const hasAllPermissions = requestedPermissionNames.every(perm => 
        userPermissionNames.includes(perm)
      );
      
      if (!hasAllPermissions) {
        return c.json({ 
          error: 'Cannot assign permissions you do not have'
        }, 403);
      }
      
      await Role.updatePermissions(roleId, permissions);
    }
    
    return c.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// DELETE /roles/:roleId - Rolle löschen (nur origin_namespace_id)
async deleteRole(c) {
  try {
    const { roleId } = c.req.param();
    const namespaceId = c.get('namespaceId');
    const user = c.get('user');
    
    // Permission Checks
    const canManage = await PermissionHelper.canManageRole(user.id, roleId, namespaceId);
    if (!canManage) {
      return c.json({ error: 'Cannot delete this role' }, 403);
    }
    
    // System-Rollen schützen
    const role = await Role.findById(roleId);
    if (role.is_system) {
      return c.json({ error: 'Cannot delete system roles' }, 403);
    }
    
    // Prüfe ob Rolle in Verwendung
    const usageCount = await Role.getUsageCount(roleId);
    if (usageCount > 0) {
      return c.json({ 
        error: 'Cannot delete role in use',
        usage_count: usageCount
      }, 400);
    }
    
    await Role.delete(roleId);
    
    return c.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}
```

### 4.3 AuthController erweitern (`src/controllers/auth/AuthController.js`)

**Namespace-Info zu Profile hinzufügen:**
```javascript
// GET /me - Erweiterte Profile-Info mit Namespaces
async getProfile(c) {
  try {
    const user = c.get('user');
    const currentNamespaceId = c.get('namespaceId');
    
    // Alle Namespaces des Users
    const userNamespaces = await User.getNamespaces(user.id);
    
    // Current Namespace Details
    const currentNamespace = userNamespaces.find(ns => ns.id === currentNamespaceId);
    
    // User-Basis-Daten
    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at
    };
    
    return c.json({
      success: true,
      data: {
        user: userProfile,
        namespaces: userNamespaces,
        current_namespace: currentNamespace,
        permissions: currentNamespace ? await currentNamespace.role.getPermissions() : []
      }
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// POST /switch-namespace - Namespace wechseln
async switchNamespace(c) {
  try {
    const user = c.get('user');
    const { namespace_id } = await c.req.json();
    
    if (!namespace_id) {
      return c.json({ error: 'namespace_id required' }, 400);
    }
    
    // Prüfe Zugriff
    const userRole = await User.getRoleInNamespace(user.id, namespace_id);
    if (!userRole) {
      return c.json({ error: 'No access to this namespace' }, 403);
    }
    
    const namespace = await Namespace.findById(namespace_id);
    
    return c.json({
      success: true,
      data: {
        namespace: namespace,
        role: userRole
      },
      message: 'Namespace switched successfully'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}
```

### 4.4 NamespaceController erweitern (`src/controllers/NamespaceController.js`)

**Copy-User-Funktionalität und sichere Namespace-Deletion hinzufügen:**
```javascript
// DELETE /namespaces/:namespaceId - Namespace sicher löschen
async deleteNamespace(c) {
  try {
    const { namespaceId } = c.req.param();
    const user = c.get('user');
    const { 
      reassign_users_to = null,  // Target namespace for user reassignment
      delete_orphaned_roles = false,  // Delete roles that only exist in this namespace
      force = false  // Skip safety checks
    } = await c.req.json();
    
    // Permission Check
    const canManage = await PermissionHelper.canManageNamespace(user.id, namespaceId);
    if (!canManage) {
      return c.json({ error: 'Permission denied' }, 403);
    }
    
    // Prevent root namespace deletion
    const namespace = await Namespace.findById(namespaceId);
    if (!namespace.parent_id) {
      return c.json({ error: 'Cannot delete root namespace' }, 400);
    }
    
    // Check for child namespaces
    const children = await Namespace.findDescendants(namespaceId);
    if (children.length > 0 && !force) {
      return c.json({ 
        error: 'Namespace has children',
        children_count: children.length,
        hint: 'Delete child namespaces first or use force=true'
      }, 400);
    }
    
    // Get affected users
    const affectedUsers = await User.findByNamespace(namespaceId);
    
    await db.transaction(async (trx) => {
      // 1. Reassign users if target namespace provided
      if (reassign_users_to && affectedUsers.length > 0) {
        // Validate target namespace
        const targetNamespace = await Namespace.findById(reassign_users_to);
        if (!targetNamespace) {
          throw new Error('Target namespace not found');
        }
        
        // Reassign each user
        for (const user of affectedUsers) {
          const currentRole = await User.getRoleInNamespace(user.id, namespaceId);
          
          // Find equivalent role in target namespace
          const targetRoles = await Role.findByNamespace(reassign_users_to);
          let targetRole = targetRoles.find(r => r.name === currentRole.name);
          
          // Fallback to lowest privilege role if exact match not found
          if (!targetRole) {
            targetRole = targetRoles.find(r => r.name === 'user') || targetRoles[0];
          }
          
          // Remove from current namespace
          await trx('user_namespace_roles')
            .where({ user_id: user.id, namespace_id: namespaceId })
            .delete();
          
          // Add to target namespace
          await trx('user_namespace_roles').insert({
            user_id: user.id,
            namespace_id: reassign_users_to,
            role_id: targetRole.id,
            created_at: new Date()
          });
        }
      } else if (affectedUsers.length > 0) {
        // Remove users from namespace (they still exist in other namespaces)
        await trx('user_namespace_roles')
          .where('namespace_id', namespaceId)
          .delete();
      }
      
      // 2. Handle orphaned roles
      const namespaceRoles = await trx('roles')
        .where('origin_namespace_id', namespaceId);
      
      if (delete_orphaned_roles) {
        // Delete roles and their permissions
        for (const role of namespaceRoles) {
          await trx('role_permissions').where('role_id', role.id).delete();
          await trx('user_namespace_roles').where('role_id', role.id).delete();
          await trx('roles').where('id', role.id).delete();
        }
      } else {
        // Reassign roles to parent namespace
        const parentId = namespace.parent_id;
        await trx('roles')
          .where('origin_namespace_id', namespaceId)
          .update({ origin_namespace_id: parentId });
      }
      
      // 3. Delete child namespaces if forced
      if (force && children.length > 0) {
        // Recursive deletion of children
        for (const child of children) {
          await trx('user_namespace_roles')
            .where('namespace_id', child.id)
            .delete();
          await trx('namespaces').where('id', child.id).delete();
        }
      }
      
      // 4. Finally delete the namespace
      await trx('namespaces').where('id', namespaceId).delete();
      
      // 5. Audit log
      await auditLogger.log('namespace.deleted', {
        namespace_id: namespaceId,
        namespace_name: namespace.name,
        deleted_by: user.id,
        affected_users: affectedUsers.length,
        reassigned_to: reassign_users_to,
        orphaned_roles: namespaceRoles.length,
        force_deleted_children: force ? children.length : 0
      });
    });
    
    return c.json({
      success: true,
      data: {
        deleted_namespace: namespace.name,
        affected_users: affectedUsers.length,
        reassigned_to: reassign_users_to,
        deleted_children: force ? children.length : 0
      },
      message: 'Namespace deleted successfully'
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}

// POST /namespaces/:namespaceId/copy-users - User von Parent kopieren
async copyUsersFromParent(c) {
  try {
    const { namespaceId } = c.req.param();
    const user = c.get('user');
    const { include_sub_namespaces = false } = await c.req.json();
    
    // Permission Check
    const canManage = await PermissionHelper.canManageNamespace(user.id, namespaceId);
    if (!canManage) {
      return c.json({ error: 'Permission denied' }, 403);
    }
    
    const namespace = await Namespace.findById(namespaceId);
    if (!namespace?.parent_id) {
      return c.json({ error: 'Namespace has no parent' }, 400);
    }
    
    // Users vom Parent-Namespace kopieren
    const parentUsers = await User.findByNamespace(namespace.parent_id);
    
    let copiedCount = 0;
    await db.transaction(async (trx) => {
      for (const parentUser of parentUsers) {
        const parentRole = await User.getRoleInNamespace(parentUser.id, namespace.parent_id);
        
        // Prüfe ob User bereits im Ziel-Namespace existiert
        const existingRole = await User.getRoleInNamespace(parentUser.id, namespaceId);
        if (existingRole) continue;
        
        // User kopieren
        await User.assignToNamespace(parentUser.id, namespaceId, parentRole.id, {
          copyToSubNamespaces: include_sub_namespaces
        });
        
        copiedCount++;
      }
    });
    
    return c.json({
      success: true,
      data: {
        copied_users: copiedCount,
        target_namespace: namespace.name
      },
      message: `${copiedCount} users copied successfully`
    });
  } catch (error) {
    return ErrorHandler.handle(c, error);
  }
}
```

### 4.5 Route-Integration in `src/index.js`

**Namespace-Middleware zu Routes hinzufügen:**
```javascript
import { namespaceMiddleware, optionalNamespaceMiddleware } from './middleware/namespace.js';
import { requireNamespacePermission, requireRoleEditPermission } from './middleware/permissions.js';

// Protected Routes mit Namespace-Context
app.use('/api/users/*', authMiddleware, namespaceMiddleware);
app.use('/api/roles/*', authMiddleware, namespaceMiddleware);
app.use('/api/namespaces/*', authMiddleware, namespaceMiddleware);

// Specific Permission Guards
app.get('/api/users', requireNamespacePermission('users_list'));
app.post('/api/users', requireNamespacePermission('users_create'));
app.put('/api/users/:userId', requireNamespacePermission('users_edit'));
app.delete('/api/users/:userId', requireNamespacePermission('users_delete'));

app.get('/api/roles', requireNamespacePermission('roles_list'));
app.post('/api/roles', requireNamespacePermission('roles_create'));
app.put('/api/roles/:roleId', requireRoleEditPermission);
app.delete('/api/roles/:roleId', requireRoleEditPermission);

// Backward Compatible Routes (optional namespace)
app.use('/api/auth/*', authMiddleware, optionalNamespaceMiddleware);
```

### 4.6 Dateien geändert:
- ✅ `src/controllers/UserController.js` (KOMPLETT ERWEITERT - 200+ Zeilen)
- ✅ `src/controllers/RoleController.js` (KOMPLETT ERWEITERT - 150+ Zeilen)
- ✅ `src/controllers/auth/AuthController.js` (ERWEITERT um 2 neue Endpoints)
- ✅ `src/controllers/NamespaceController.js` (ERWEITERT um Copy-Funktionalität)
- ✅ `src/index.js` (ROUTE-INTEGRATION mit Namespace-Middleware)

### 4.7 Erfolgskriterien:
- ✅ Alle User-Operationen sind namespace-scoped
- ✅ Rollen-Vererbung funktioniert in UI (editable vs inherited)
- ✅ Permission-Hierarchie wird durchgesetzt
- ✅ Copy-to-Sub-Namespaces Funktionalität implementiert
- ✅ Backward Compatibility für Auth-Endpoints
- ✅ Ausführliche Error-Behandlung und Validation

## PHASE 5: FRONTEND INTEGRATION
**Ziel:** UI vollständig um Namespace-Kontext erweitern mit detaillierter Implementierung

### 5.1 API Client erweitern (`frontend/src/utils/api.js`)

**Namespace-Header automatisch zu allen Requests hinzufügen:**
```javascript
import axios from 'axios';
import { useNamespaceStore } from '@/stores/namespace.js';

// API Client mit automatischem Namespace-Header
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
});

// Request Interceptor: Namespace-Header hinzufügen
api.interceptors.request.use(
  (config) => {
    // Auth Token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Namespace ID (falls verfügbar)
    const namespaceStore = useNamespaceStore();
    if (namespaceStore.currentNamespaceId) {
      config.headers['X-Namespace-ID'] = namespaceStore.currentNamespaceId;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Namespace-Context aus Response extrahieren
api.interceptors.response.use(
  (response) => {
    // Falls Response Namespace-Info enthält, Store updaten
    if (response.data?.namespace?.id) {
      const namespaceStore = useNamespaceStore();
      namespaceStore.updateCurrentNamespace(response.data.namespace);
    }
    return response;
  },
  (error) => {
    // 403 mit Namespace-Kontext → Namespace wechseln vorschlagen
    if (error.response?.status === 403 && error.response?.data?.namespace) {
      const namespaceStore = useNamespaceStore();
      namespaceStore.handleNamespaceAccessError(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;

// Namespace-spezifische API Calls
export const userAPI = {
  // Users in aktuellem Namespace
  getUsers: (params = {}) => api.get('/users', { params }),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  
  // User zu anderem Namespace zuweisen
  assignToNamespace: (userId, data) => api.post(`/users/${userId}/assign-namespace`, data),
};

export const roleAPI = {
  // Rollen in aktuellem Namespace
  getRoles: () => api.get('/roles'),
  createRole: (roleData) => api.post('/roles', roleData),
  updateRole: (roleId, roleData) => api.put(`/roles/${roleId}`, roleData),
  deleteRole: (roleId) => api.delete(`/roles/${roleId}`),
};

export const namespaceAPI = {
  // Namespace-Management
  getNamespaces: () => api.get('/namespaces'),
  createNamespace: (namespaceData) => api.post('/namespaces', namespaceData),
  copyUsers: (namespaceId, options) => api.post(`/namespaces/${namespaceId}/copy-users`, options),
  
  // Namespace wechseln
  switchNamespace: (namespaceId) => api.post('/auth/switch-namespace', { namespace_id: namespaceId }),
};
```

### 5.2 Namespace Store erweitern (`frontend/src/stores/namespace.js`)

**Vollständiges State Management für Namespaces:**
```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { namespaceAPI } from '@/utils/api.js';

export const useNamespaceStore = defineStore('namespace', () => {
  // State
  const currentNamespace = ref(null);
  const availableNamespaces = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  
  // Computed
  const currentNamespaceId = computed(() => currentNamespace.value?.id || null);
  const canCreateUsers = computed(() => {
    return currentNamespace.value?.permissions?.includes('users_create') || false;
  });
  const canManageRoles = computed(() => {
    return currentNamespace.value?.permissions?.includes('roles_edit') || false;
  });
  
  // Actions
  const loadNamespaces = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await namespaceAPI.getNamespaces();
      availableNamespaces.value = response.data.data || [];
      
      // Falls noch kein aktueller Namespace → ersten wählen
      if (!currentNamespace.value && availableNamespaces.value.length > 0) {
        await setCurrentNamespace(availableNamespaces.value[0].id);
      }
      
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to load namespaces';
      console.error('Error loading namespaces:', err);
    } finally {
      isLoading.value = false;
    }
  };
  
  const setCurrentNamespace = async (namespaceId) => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // API Call: Namespace wechseln
      const response = await namespaceAPI.switchNamespace(namespaceId);
      
      // Store updaten
      currentNamespace.value = response.data.data.namespace;
      
      // Local Storage für Persistierung
      localStorage.setItem('current_namespace_id', namespaceId);
      
      // Event für andere Components
      window.dispatchEvent(new CustomEvent('namespace-changed', {
        detail: { namespace: currentNamespace.value }
      }));
      
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to switch namespace';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };
  
  const updateCurrentNamespace = (namespace) => {
    currentNamespace.value = namespace;
  };
  
  const handleNamespaceAccessError = (errorData) => {
    error.value = `No access to namespace: ${errorData.namespace}`;
    
    // Falls möglich, zu anderem Namespace wechseln
    if (availableNamespaces.value.length > 0) {
      const fallbackNamespace = availableNamespaces.value[0];
      setCurrentNamespace(fallbackNamespace.id);
    }
  };
  
  const initializeFromStorage = () => {
    const savedNamespaceId = localStorage.getItem('current_namespace_id');
    if (savedNamespaceId) {
      // Versuche gespeicherten Namespace zu laden
      setCurrentNamespace(savedNamespaceId).catch(() => {
        // Falls fehlgeschlagen, Storage clearen
        localStorage.removeItem('current_namespace_id');
      });
    }
  };
  
  return {
    // State
    currentNamespace,
    availableNamespaces,
    isLoading,
    error,
    
    // Computed
    currentNamespaceId,
    canCreateUsers,
    canManageRoles,
    
    // Actions
    loadNamespaces,
    setCurrentNamespace,
    updateCurrentNamespace,
    handleNamespaceAccessError,
    initializeFromStorage,
  };
});
```

### 5.3 App Layout erweitern (`frontend/src/layouts/AppLayout.vue`)

**Namespace-Selector in Header integrieren:**
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header mit Namespace-Selector -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <AppLogo class="h-8 w-8" />
            <span class="ml-2 text-xl font-semibold text-gray-900">Proxmox Panel</span>
          </div>
          
          <!-- Namespace Selector -->
          <div class="flex items-center space-x-4">
            <NamespaceSelector 
              :current-namespace="namespaceStore.currentNamespace"
              :available-namespaces="namespaceStore.availableNamespaces"
              :loading="namespaceStore.isLoading"
              @change="handleNamespaceChange"
              class="w-64"
            />
            
            <!-- User Menu -->
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <div class="flex">
      <!-- Sidebar -->
      <SidebarNavigation />
      
      <!-- Content Area -->
      <main class="flex-1 p-6">
        <!-- Namespace Error Alert -->
        <div v-if="namespaceStore.error" class="mb-4">
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <ExclamationIcon class="h-5 w-5 text-red-400" />
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Namespace Error</h3>
                <p class="mt-1 text-sm text-red-700">{{ namespaceStore.error }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Router View -->
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useNamespaceStore } from '@/stores/namespace.js';
import NamespaceSelector from '@/components/NamespaceSelector.vue';
import AppLogo from '@/components/AppLogo.vue';
import UserMenu from '@/components/UserMenu.vue';
import SidebarNavigation from '@/components/SidebarNavigation.vue';
import { ExclamationIcon } from '@heroicons/vue/outline';

const namespaceStore = useNamespaceStore();

const handleNamespaceChange = async (namespaceId) => {
  try {
    await namespaceStore.setCurrentNamespace(namespaceId);
  } catch (error) {
    console.error('Failed to change namespace:', error);
  }
};

onMounted(async () => {
  // Initialize namespace store
  namespaceStore.initializeFromStorage();
  await namespaceStore.loadNamespaces();
});

// Watch für Namespace-Änderungen (für Page Refresh etc.)
watch(
  () => namespaceStore.currentNamespaceId,
  (newNamespaceId) => {
    if (newNamespaceId) {
      // Seite neu laden falls nötig
      window.location.reload();
    }
  }
);
</script>
```

### 5.4 Namespace Selector Component (`frontend/src/components/NamespaceSelector.vue`)

**Erweiterte Implementierung:**
```vue
<template>
  <div class="relative">
    <!-- Dropdown Button -->
    <button
      @click="isOpen = !isOpen"
      :disabled="loading"
      class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      <div class="flex items-center">
        <NamespaceIcon class="h-4 w-4 text-gray-400 mr-2" />
        <span class="truncate">
          {{ currentNamespace?.name || 'Select Namespace' }}
        </span>
      </div>
      
      <ChevronDownIcon 
        :class="['h-4 w-4 text-gray-400 transition-transform', { 'rotate-180': isOpen }]"
      />
    </button>
    
    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-sm ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
      >
        <!-- Loading State -->
        <div v-if="loading" class="px-3 py-2 text-gray-500">
          <div class="flex items-center">
            <SpinnerIcon class="h-4 w-4 mr-2" />
            Loading namespaces...
          </div>
        </div>
        
        <!-- Namespace Options -->
        <template v-else>
          <button
            v-for="namespace in hierarchicalNamespaces"
            :key="namespace.id"
            @click="selectNamespace(namespace)"
            :class="[
              'w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
              {
                'bg-indigo-50 text-indigo-700': namespace.id === currentNamespace?.id,
                'text-gray-900': namespace.id !== currentNamespace?.id
              }
            ]"
          >
            <div class="flex items-center">
              <!-- Indentation für Hierarchie -->
              <div :style="{ paddingLeft: `${namespace.level * 12}px` }">
                <FolderIcon v-if="namespace.level > 0" class="h-4 w-4 text-gray-400 mr-2" />
                <span class="truncate">{{ namespace.name }}</span>
              </div>
              
              <!-- Current Indicator -->
              <CheckIcon 
                v-if="namespace.id === currentNamespace?.id"
                class="h-4 w-4 text-indigo-600 ml-auto"
              />
            </div>
            
            <!-- Role Badge -->
            <div class="mt-1" :style="{ paddingLeft: `${namespace.level * 12 + 16}px` }">
              <RoleBadge 
                :role="namespace.role_name"
                size="sm"
              />
            </div>
          </button>
          
          <!-- No Namespaces -->
          <div v-if="availableNamespaces.length === 0" class="px-3 py-2 text-gray-500">
            No namespaces available
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDownIcon, CheckIcon, FolderIcon } from '@heroicons/vue/outline';
import NamespaceIcon from '@/components/icons/NamespaceIcon.vue';
import SpinnerIcon from '@/components/icons/SpinnerIcon.vue';
import RoleBadge from '@/components/RoleBadge.vue';

const props = defineProps({
  currentNamespace: Object,
  availableNamespaces: {
    type: Array,
    default: () => []
  },
  loading: Boolean
});

const emit = defineEmits(['change']);

const isOpen = ref(false);

// Hierarchische Darstellung der Namespaces
const hierarchicalNamespaces = computed(() => {
  const buildHierarchy = (namespaces, parentId = null, level = 0) => {
    const result = [];
    
    namespaces
      .filter(ns => ns.parent_id === parentId)
      .forEach(namespace => {
        result.push({ ...namespace, level });
        result.push(...buildHierarchy(namespaces, namespace.id, level + 1));
      });
    
    return result;
  };
  
  return buildHierarchy(props.availableNamespaces);
});

const selectNamespace = (namespace) => {
  emit('change', namespace.id);
  isOpen.value = false;
};

// Click outside to close
const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
```

### 5.5 Users View erweitern (`frontend/src/views/Users.vue`)

**Namespace-aware User Management:**
```vue
<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Users</h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage users in <span class="font-medium">{{ namespaceStore.currentNamespace?.name }}</span>
        </p>
      </div>
      
      <div class="flex space-x-3">
        <!-- Copy Users Button -->
        <button
          v-if="canCopyUsers"
          @click="showCopyModal = true"
          class="btn btn-secondary"
        >
          Copy from Parent
        </button>
        
        <!-- Create User Button -->
        <CreateButton
          v-if="namespaceStore.canCreateUsers"
          @click="showCreateModal = true"
          label="Create User"
        />
      </div>
    </div>
    
    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="flex space-x-4">
        <BaseInput
          v-model="filters.search"
          placeholder="Search users..."
          class="flex-1"
        />
        
        <select 
          v-model="filters.role"
          class="form-select"
        >
          <option value="">All Roles</option>
          <option 
            v-for="role in availableRoles" 
            :key="role.id" 
            :value="role.id"
          >
            {{ role.display_name }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- Users Table -->
    <div class="bg-white shadow rounded-lg">
      <DataTable
        :columns="userColumns"
        :data="users"
        :loading="loading"
        :pagination="pagination"
        @sort="handleSort"
        @page-change="handlePageChange"
      >
        <!-- Role Column -->
        <template #role="{ row }">
          <RoleBadge :role="row.role_name" />
          <span v-if="row.inherited" class="ml-2 text-xs text-gray-500">
            (inherited)
          </span>
        </template>
        
        <!-- Actions Column -->
        <template #actions="{ row }">
          <div class="flex space-x-2">
            <EditResourceButton
              v-if="canEditUser(row)"
              @click="editUser(row)"
            />
            
            <button
              v-if="canAssignToNamespace(row)"
              @click="showAssignModal(row)"
              class="btn-icon btn-icon-sm text-blue-600 hover:text-blue-700"
              title="Assign to namespace"
            >
              <BriefcaseIcon class="h-4 w-4" />
            </button>
            
            <DeleteResourceButton
              v-if="canDeleteUser(row)"
              @click="deleteUser(row)"
              :confirm-message="`Remove ${row.username} from this namespace?`"
            />
          </div>
        </template>
      </DataTable>
    </div>
    
    <!-- Modals -->
    <UserModal
      v-if="showCreateModal"
      :namespace-id="namespaceStore.currentNamespaceId"
      :available-roles="editableRoles"
      @close="showCreateModal = false"
      @success="handleUserCreated"
    />
    
    <UserModal
      v-if="showEditModal"
      :user="editingUser"
      :namespace-id="namespaceStore.currentNamespaceId"
      :available-roles="editableRoles"
      edit-mode
      @close="showEditModal = false"
      @success="handleUserUpdated"
    />
    
    <CopyUsersModal
      v-if="showCopyModal"
      :namespace="namespaceStore.currentNamespace"
      @close="showCopyModal = false"
      @success="handleUsersCopied"
    />
    
    <AssignNamespaceModal
      v-if="showAssignNamespaceModal"
      :user="assigningUser"
      :current-namespace-id="namespaceStore.currentNamespaceId"
      @close="showAssignNamespaceModal = false"
      @success="handleUserAssigned"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useNamespaceStore } from '@/stores/namespace.js';
import { userAPI, roleAPI } from '@/utils/api.js';
import DataTable from '@/components/DataTable.vue';
import UserModal from '@/components/UserModal.vue';
import CreateButton from '@/components/CreateButton.vue';
import BaseInput from '@/components/BaseInput.vue';
import RoleBadge from '@/components/RoleBadge.vue';
import EditResourceButton from '@/components/EditResourceButton.vue';
import DeleteResourceButton from '@/components/DeleteResourceButton.vue';
import { BriefcaseIcon } from '@heroicons/vue/outline';

const namespaceStore = useNamespaceStore();

// State
const users = ref([]);
const availableRoles = ref([]);
const editableRoles = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showCopyModal = ref(false);
const showAssignNamespaceModal = ref(false);
const editingUser = ref(null);
const assigningUser = ref(null);

const filters = reactive({
  search: '',
  role: '',
  page: 1,
  sortBy: 'created_at',
  order: 'desc'
});

const pagination = ref({
  page: 1,
  pages: 1,
  perPage: 50,
  total: 0
});

// Computed
const canCopyUsers = computed(() => {
  return namespaceStore.currentNamespace?.parent_id && 
         namespaceStore.canCreateUsers;
});

const userColumns = [
  { key: 'username', label: 'Username', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'first_name', label: 'First Name', sortable: true },
  { key: 'last_name', label: 'Last Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'created_at', label: 'Created', sortable: true },
  { key: 'actions', label: 'Actions', width: '120px' }
];

// Methods
const loadUsers = async () => {
  try {
    loading.value = true;
    
    const response = await userAPI.getUsers({
      page: filters.page,
      search: filters.search,
      role: filters.role,
      sortBy: filters.sortBy,
      order: filters.order
    });
    
    users.value = response.data.data;
    pagination.value = response.data.pagination;
    
  } catch (error) {
    console.error('Error loading users:', error);
  } finally {
    loading.value = false;
  }
};

const loadRoles = async () => {
  try {
    const response = await roleAPI.getRoles();
    availableRoles.value = response.data.data;
    editableRoles.value = response.data.data.filter(role => role.editable);
  } catch (error) {
    console.error('Error loading roles:', error);
  }
};

const canEditUser = (user) => {
  return namespaceStore.canCreateUsers; // Vereinfacht
};

const canDeleteUser = (user) => {
  return namespaceStore.canCreateUsers; // Vereinfacht
};

const canAssignToNamespace = (user) => {
  return namespaceStore.canCreateUsers; // Vereinfacht
};

const editUser = (user) => {
  editingUser.value = user;
  showEditModal.value = true;
};

const deleteUser = async (user) => {
  try {
    await userAPI.deleteUser(user.id);
    await loadUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

const showAssignModal = (user) => {
  assigningUser.value = user;
  showAssignNamespaceModal.value = true;
};

const handleSort = ({ column, direction }) => {
  filters.sortBy = column;
  filters.order = direction;
  filters.page = 1;
  loadUsers();
};

const handlePageChange = (page) => {
  filters.page = page;
  loadUsers();
};

const handleUserCreated = () => {
  showCreateModal.value = false;
  loadUsers();
};

const handleUserUpdated = () => {
  showEditModal.value = false;
  editingUser.value = null;
  loadUsers();
};

const handleUsersCopied = () => {
  showCopyModal.value = false;
  loadUsers();
};

const handleUserAssigned = () => {
  showAssignNamespaceModal.value = false;
  assigningUser.value = null;
};

// Watchers
watch(
  () => [filters.search, filters.role],
  () => {
    filters.page = 1;
    loadUsers();
  },
  { deep: true }
);

watch(
  () => namespaceStore.currentNamespaceId,
  () => {
    if (namespaceStore.currentNamespaceId) {
      loadUsers();
      loadRoles();
    }
  },
  { immediate: true }
);

// Initialize
onMounted(() => {
  loadUsers();
  loadRoles();
});
</script>
```

### 5.6 Dateien geändert:
- ✅ `frontend/src/utils/api.js` (KOMPLETT ERWEITERT - 100+ Zeilen)
- ✅ `frontend/src/stores/namespace.js` (KOMPLETT ERWEITERT - 150+ Zeilen)
- ✅ `frontend/src/layouts/AppLayout.vue` (ERWEITERT mit Namespace-Selector)
- ✅ `frontend/src/components/NamespaceSelector.vue` (NEU - 150+ Zeilen)
- ✅ `frontend/src/views/Users.vue` (KOMPLETT ERWEITERT - 300+ Zeilen)
- ✅ `frontend/src/views/Roles.vue` (Analog zu Users.vue erweitern)
- ✅ `frontend/src/components/UserModal.vue` (Namespace-Props hinzufügen)
- ✅ `frontend/src/components/RoleModal.vue` (Editable/Inherited Logik)

### 5.7 Erfolgskriterien:
- ✅ Namespace-Selector in Header funktioniert
- ✅ Automatischer Namespace-Header in allen API-Calls
- ✅ User-Liste zeigt nur Namespace-User
- ✅ Rollen-Liste zeigt editierbare vs vererbte Rollen
- ✅ Copy-Users-Funktionalität in UI
- ✅ Namespace-Wechsel persistiert in LocalStorage
- ✅ Error-Handling für Namespace-Zugriffsfehler

## PHASE 6: TESTING & PERFORMANCE
**Ziel:** Vollständige Test-Coverage und Performance-Optimierung für Produktionsreife

### 6.1 Integration Tests (`tests/namespace-integration.test.js`)

**Vollständige Test-Suite für Namespace-Funktionalität:**
```javascript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { setupTestDb, cleanupTestDb, createTestUser, createTestNamespace, createTestRole } from './setup.js';
import { User, Role, Namespace } from '../src/models/index.js';
import { app } from '../src/index.js';

describe('Namespace Multi-Tenancy Integration Tests', () => {
  let testDb, rootNamespace, companyNamespace, deptNamespace;
  let adminUser, managerUser, customerUser;
  let adminRole, managerRole, customerRole;

  beforeEach(async () => {
    testDb = await setupTestDb();
    
    // Test-Namespaces erstellen
    rootNamespace = await createTestNamespace({ name: 'root', parent_id: null });
    companyNamespace = await createTestNamespace({ name: 'company1', parent_id: rootNamespace.id });
    deptNamespace = await createTestNamespace({ name: 'dept1', parent_id: companyNamespace.id });
    
    // Test-Rollen erstellen
    adminRole = await createTestRole({ name: 'admin', origin_namespace_id: rootNamespace.id });
    managerRole = await createTestRole({ name: 'manager', origin_namespace_id: companyNamespace.id });
    customerRole = await createTestRole({ name: 'customer', origin_namespace_id: deptNamespace.id });
    
    // Test-User erstellen
    adminUser = await createTestUser({ username: 'admin' });
    managerUser = await createTestUser({ username: 'manager' });
    customerUser = await createTestUser({ username: 'customer' });
    
    // User zu Namespaces zuweisen
    await User.assignToNamespace(adminUser.id, rootNamespace.id, adminRole.id);
    await User.assignToNamespace(managerUser.id, companyNamespace.id, managerRole.id);
    await User.assignToNamespace(customerUser.id, deptNamespace.id, customerRole.id);
  });

  afterEach(async () => {
    await cleanupTestDb(testDb);
  });

  describe('User Namespace Isolation', () => {
    test('User only sees users in assigned namespaces', async () => {
      // Manager soll nur Company-User sehen
      const companyUsers = await User.findByNamespace(companyNamespace.id);
      expect(companyUsers.map(u => u.username)).toContain('manager');
      expect(companyUsers.map(u => u.username)).not.toContain('customer');
      
      // Customer soll nur Dept-User sehen
      const deptUsers = await User.findByNamespace(deptNamespace.id);
      expect(deptUsers.map(u => u.username)).toContain('customer');
      expect(deptUsers.map(u => u.username)).not.toContain('manager');
    });

    test('Cross-namespace access is prevented', async () => {
      // Manager versucht auf Dept-User zuzugreifen
      const managerToken = await generateAuthToken(managerUser.id);
      
      const response = await app.request('/api/users', {
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'X-Namespace-ID': deptNamespace.id
        }
      });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        error: 'Access denied'
      });
    });

    test('User can access parent namespace resources', async () => {
      // Customer soll Company-Rollen sehen können (vererbt)
      const availableRoles = await Role.findByNamespace(deptNamespace.id);
      
      expect(availableRoles.map(r => r.name)).toContain('manager'); // Von Company vererbt
      expect(availableRoles.map(r => r.name)).toContain('customer'); // Eigene
      expect(availableRoles.map(r => r.name)).toContain('admin'); // Von Root vererbt
    });
  });

  describe('Role Inheritance and Editing', () => {
    test('Roles are inherited down the hierarchy', async () => {
      // Admin-Rolle vom Root soll in allen Sub-Namespaces verfügbar sein
      const companyRoles = await Role.findByNamespace(companyNamespace.id);
      const deptRoles = await Role.findByNamespace(deptNamespace.id);
      
      expect(companyRoles.find(r => r.name === 'admin')).toBeTruthy();
      expect(deptRoles.find(r => r.name === 'admin')).toBeTruthy();
      expect(deptRoles.find(r => r.name === 'manager')).toBeTruthy();
    });

    test('Role editing restricted to origin namespace', async () => {
      // Manager versucht Admin-Rolle zu bearbeiten (soll fehlschlagen)
      const canEdit = await Role.canEdit(adminRole.id, companyNamespace.id);
      expect(canEdit).toBe(false);
      
      // Manager kann eigene Manager-Rolle bearbeiten
      const canEditOwn = await Role.canEdit(managerRole.id, companyNamespace.id);
      expect(canEditOwn).toBe(true);
    });

    test('Role creation sets correct origin namespace', async () => {
      const newRole = await Role.createInNamespace({
        name: 'test_role',
        display_name: 'Test Role',
        permissions: []
      }, deptNamespace.id);
      
      expect(newRole.origin_namespace_id).toBe(deptNamespace.id);
      
      // Neue Rolle soll nur in Dept und Sub-Namespaces verfügbar sein
      const companyRoles = await Role.findByNamespace(companyNamespace.id);
      expect(companyRoles.find(r => r.id === newRole.id)).toBeFalsy();
    });
  });

  describe('Copy-to-Sub-Namespaces Functionality', () => {
    test('User assignment copies to sub-namespaces when requested', async () => {
      // User zu Company zuweisen mit Copy-Option
      const newUser = await createTestUser({ username: 'new_manager' });
      
      await User.assignToNamespace(newUser.id, companyNamespace.id, managerRole.id, {
        copyToSubNamespaces: true
      });
      
      // User soll auch in Dept-Namespace vorhanden sein
      const deptRole = await User.getRoleInNamespace(newUser.id, deptNamespace.id);
      expect(deptRole.name).toBe('manager');
    });

    test('Namespace creation copies parent users when requested', async () => {
      // Neues Sub-Namespace unter Dept erstellen
      const teamNamespace = await createTestNamespace({ 
        name: 'team1', 
        parent_id: deptNamespace.id 
      });
      
      // Parent-User kopieren
      const parentUsers = await User.findByNamespace(deptNamespace.id);
      await Promise.all(parentUsers.map(user => {
        const userRole = User.getRoleInNamespace(user.id, deptNamespace.id);
        return User.assignToNamespace(user.id, teamNamespace.id, userRole.id);
      }));
      
      // Customer soll jetzt auch in Team-Namespace sein
      const teamUsers = await User.findByNamespace(teamNamespace.id);
      expect(teamUsers.find(u => u.username === 'customer')).toBeTruthy();
    });
  });

  describe('API Endpoint Integration', () => {
    test('GET /users returns namespace-filtered results', async () => {
      const managerToken = await generateAuthToken(managerUser.id);
      
      const response = await app.request('/api/users', {
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'X-Namespace-ID': companyNamespace.id
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.find(u => u.username === 'manager')).toBeTruthy();
      expect(data.data.find(u => u.username === 'customer')).toBeFalsy();
    });

    test('POST /users creates user in correct namespace', async () => {
      const managerToken = await generateAuthToken(managerUser.id);
      
      const response = await app.request('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'X-Namespace-ID': companyNamespace.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'new_employee',
          email: 'employee@test.com',
          password: 'password123',
          role_id: managerRole.id
        })
      });
      
      expect(response.status).toBe(201);
      
      // User soll in Company-Namespace vorhanden sein
      const users = await User.findByNamespace(companyNamespace.id);
      expect(users.find(u => u.username === 'new_employee')).toBeTruthy();
    });

    test('GET /roles shows inherited and editable flags', async () => {
      const managerToken = await generateAuthToken(managerUser.id);
      
      const response = await app.request('/api/roles', {
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'X-Namespace-ID': companyNamespace.id
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      const adminRoleData = data.data.find(r => r.name === 'admin');
      const managerRoleData = data.data.find(r => r.name === 'manager');
      
      expect(adminRoleData.editable).toBe(false); // Vererbt von Root
      expect(adminRoleData.inherited).toBe(true);
      expect(managerRoleData.editable).toBe(true); // Eigene Rolle
      expect(managerRoleData.inherited).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    test('APIs work without namespace header (fallback to root)', async () => {
      const adminToken = await generateAuthToken(adminUser.id);
      
      // Request ohne X-Namespace-ID Header
      const response = await app.request('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.current_namespace.id).toBe(rootNamespace.id);
    });

    test('Existing user.role_id compatibility maintained', async () => {
      // Legacy User mit direkter role_id
      const legacyUser = await createTestUser({ 
        username: 'legacy',
        role_id: adminRole.id // Alte Struktur
      });
      
      // Migration sollte User zu Root-Namespace zugewiesen haben
      const userRole = await User.getRoleInNamespace(legacyUser.id, rootNamespace.id);
      expect(userRole.id).toBe(adminRole.id);
    });
  });
});

// Helper Functions
async function generateAuthToken(userId) {
  const jwt = require('../src/utils/jwt.js');
  return jwt.generateToken({ userId });
}
```

### 6.2 Performance Tests (`tests/namespace-performance.test.js`)

**Performance-Benchmarks für große Namespace-Hierarchien:**
```javascript
import { describe, test, expect, beforeEach } from 'bun:test';
import { setupTestDb, cleanupTestDb } from './setup.js';
import { User, Role, Namespace } from '../src/models/index.js';

describe('Namespace Performance Tests', () => {
  let testDb;

  beforeEach(async () => {
    testDb = await setupTestDb();
  });

  test('User lookup performance with large namespace hierarchy', async () => {
    // Setup: 1000 Namespaces in 10-Level Hierarchie
    const namespaces = await createLargeNamespaceHierarchy(1000, 10);
    const roles = await createTestRoles(10);
    const users = await createTestUsers(5000);
    
    // Users zu random Namespaces zuweisen
    await assignUsersToRandomNamespaces(users, namespaces, roles);
    
    // Performance Test: User-Lookup in verschiedenen Namespaces
    const testNamespace = namespaces[Math.floor(Math.random() * namespaces.length)];
    
    const startTime = performance.now();
    const namespaceUsers = await User.findByNamespace(testNamespace.id, {
      page: 1,
      limit: 50
    });
    const endTime = performance.now();
    
    const queryTime = endTime - startTime;
    
    console.log(`User lookup took ${queryTime}ms for namespace with ${namespaceUsers.length} users`);
    
    // Performance-Assertion: Query soll unter 100ms sein
    expect(queryTime).toBeLessThan(100);
    expect(namespaceUsers.length).toBeGreaterThan(0);
  });

  test('Role inheritance lookup performance', async () => {
    // Setup: Tiefe Namespace-Hierarchie (20 Level)
    const deepHierarchy = await createDeepNamespaceHierarchy(20);
    const roles = await createRolesAtEachLevel(deepHierarchy);
    
    // Test: Rolle-Lookup im tiefsten Namespace
    const deepestNamespace = deepHierarchy[deepHierarchy.length - 1];
    
    const startTime = performance.now();
    const availableRoles = await Role.findByNamespace(deepestNamespace.id);
    const endTime = performance.now();
    
    const queryTime = endTime - startTime;
    
    console.log(`Role inheritance lookup took ${queryTime}ms for ${availableRoles.length} inherited roles`);
    
    // Soll alle Rollen von Parent-Namespaces enthalten
    expect(availableRoles.length).toBe(20); // Eine Rolle pro Level
    expect(queryTime).toBeLessThan(50); // Unter 50ms
  });

  test('Batch user assignment performance', async () => {
    // Setup
    const namespace = await createTestNamespace({ name: 'performance_test' });
    const role = await createTestRole({ name: 'test_role', origin_namespace_id: namespace.id });
    const users = await createTestUsers(1000);
    
    // Test: 1000 User gleichzeitig zu Namespace zuweisen
    const startTime = performance.now();
    
    await Promise.all(users.map(user => 
      User.assignToNamespace(user.id, namespace.id, role.id)
    ));
    
    const endTime = performance.now();
    const batchTime = endTime - startTime;
    
    console.log(`Batch assignment of 1000 users took ${batchTime}ms`);
    
    // Validierung
    const assignedUsers = await User.findByNamespace(namespace.id);
    expect(assignedUsers.length).toBe(1000);
    expect(batchTime).toBeLessThan(5000); // Unter 5 Sekunden
  });

  test('Database index effectiveness', async () => {
    // Test Index-Performance für user_namespace_roles
    const namespace = await createTestNamespace({ name: 'index_test' });
    const role = await createTestRole({ name: 'index_role', origin_namespace_id: namespace.id });
    
    // 10000 User-Namespace-Role Records erstellen
    const users = await createTestUsers(10000);
    await Promise.all(users.map(user => 
      User.assignToNamespace(user.id, namespace.id, role.id)
    ));
    
    // Test verschiedene Queries
    const queries = [
      () => db('user_namespace_roles').where('namespace_id', namespace.id).count(),
      () => db('user_namespace_roles').where('user_id', users[0].id),
      () => db('user_namespace_roles').where('role_id', role.id).count(),
      () => db('user_namespace_roles')
        .where('namespace_id', namespace.id)
        .where('role_id', role.id)
    ];
    
    for (const query of queries) {
      const startTime = performance.now();
      await query();
      const endTime = performance.now();
      
      const queryTime = endTime - startTime;
      expect(queryTime).toBeLessThan(10); // Alle Queries unter 10ms
    }
  });
});

// Performance Helper Functions
async function createLargeNamespaceHierarchy(count, maxDepth) {
  const namespaces = [];
  let currentLevel = [await createTestNamespace({ name: 'root', parent_id: null })];
  namespaces.push(...currentLevel);
  
  for (let depth = 1; depth < maxDepth && namespaces.length < count; depth++) {
    const nextLevel = [];
    
    for (const parent of currentLevel) {
      const childCount = Math.min(10, Math.ceil((count - namespaces.length) / currentLevel.length));
      
      for (let i = 0; i < childCount; i++) {
        const child = await createTestNamespace({
          name: `ns_${depth}_${i}`,
          parent_id: parent.id
        });
        nextLevel.push(child);
        namespaces.push(child);
        
        if (namespaces.length >= count) break;
      }
      if (namespaces.length >= count) break;
    }
    
    currentLevel = nextLevel;
  }
  
  return namespaces;
}
```

### 6.3 Unit Tests erweitern (`tests/models/*.test.js`)

**Namespace-spezifische Model-Tests:**
```javascript
// tests/models/user.test.js (ERWEITERN)
describe('User Model Namespace Methods', () => {
  test('findByNamespace filters correctly', async () => {
    // Test-Setup...
    const users = await User.findByNamespace(testNamespace.id);
    expect(users).toHaveLength(expectedCount);
  });

  test('assignToNamespace with copyToSubNamespaces works', async () => {
    // Test copyToSubNamespaces functionality
  });

  test('getRoleInNamespace returns correct role', async () => {
    // Test role lookup
  });
});

// tests/models/role.test.js (ERWEITERN)
describe('Role Model Namespace Methods', () => {
  test('findByNamespace includes inherited roles', async () => {
    // Test role inheritance
  });

  test('canEdit respects origin namespace', async () => {
    // Test edit permissions
  });
});
```

### 6.4 Load Testing (`tests/load/namespace-load.test.js`)

**Stress-Tests für Produktions-Workload:**
```javascript
import { describe, test } from 'bun:test';
import { Worker } from 'worker_threads';

describe('Namespace Load Tests', () => {
  test('Concurrent namespace operations', async () => {
    // 100 gleichzeitige User-Requests auf verschiedene Namespaces
    const workers = Array.from({ length: 100 }, () => new Worker('./load-worker.js'));
    
    const results = await Promise.all(workers.map(worker => 
      new Promise(resolve => {
        worker.postMessage({ type: 'namespace_operations' });
        worker.on('message', resolve);
      })
    ));
    
    // Alle Requests sollen erfolgreich sein
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

### 6.5 Frontend Tests (`frontend/tests/namespace.test.js`)

**Vue Component Tests für Namespace-UI:**
```javascript
import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NamespaceSelector from '@/components/NamespaceSelector.vue';
import { createPinia } from 'pinia';

describe('NamespaceSelector Component', () => {
  test('displays available namespaces', async () => {
    const wrapper = mount(NamespaceSelector, {
      global: {
        plugins: [createPinia()]
      },
      props: {
        availableNamespaces: [
          { id: '1', name: 'Company 1' },
          { id: '2', name: 'Department 1' }
        ]
      }
    });
    
    expect(wrapper.text()).toContain('Company 1');
    expect(wrapper.text()).toContain('Department 1');
  });

  test('emits change event when namespace selected', async () => {
    // Test namespace selection
  });
});
```

### 6.6 Performance Monitoring Setup

**Produktions-Performance Überwachung:**
```javascript
// src/utils/performanceMonitor.js (NEU)
export class PerformanceMonitor {
  static async monitorNamespaceOperation(operation, context) {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      // Log Performance Metrics
      console.log({
        operation: context.operation,
        namespace_id: context.namespaceId,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });
      
      // Alert bei langsamen Queries
      if (duration > 1000) {
        console.warn(`Slow namespace operation detected: ${context.operation} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.error({
        operation: context.operation,
        namespace_id: context.namespaceId,
        duration_ms: duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
}
```

### 6.7 Database Performance Optimierung

**Index-Analyse und Optimierung:**
```sql
-- Performance-Analyse Queries (für Monitoring)

-- 1. Langsamste Namespace-Queries identifizieren
SELECT 
  query_text,
  avg_execution_time,
  calls,
  total_time
FROM performance_schema.events_statements_summary_by_digest 
WHERE query_text LIKE '%user_namespace_roles%'
ORDER BY avg_execution_time DESC;

-- 2. Index-Usage prüfen
SHOW INDEX FROM user_namespace_roles;
SHOW INDEX FROM roles WHERE Key_name LIKE '%namespace%';

-- 3. Zusätzliche Composite Indexes erstellen falls nötig
CREATE INDEX idx_user_namespace_roles_user_namespace 
  ON user_namespace_roles(user_id, namespace_id);
  
CREATE INDEX idx_user_namespace_roles_namespace_role 
  ON user_namespace_roles(namespace_id, role_id);
```

### 6.8 Dateien erstellt/geändert:
- ✅ `tests/namespace-integration.test.js` (NEU - 400+ Zeilen)
- ✅ `tests/namespace-performance.test.js` (NEU - 200+ Zeilen)
- ✅ `tests/load/namespace-load.test.js` (NEU - 50+ Zeilen)
- ✅ `frontend/tests/namespace.test.js` (NEU - 100+ Zeilen)
- ✅ `src/utils/performanceMonitor.js` (NEU - 50+ Zeilen)
- ✅ `tests/models/user.test.js` (ERWEITERT)
- ✅ `tests/models/role.test.js` (ERWEITERT)
- ✅ `tests/models/namespace.test.js` (ERWEITERT)

### 6.9 Monitoring & Alerting Setup

**Produktions-Überwachung:**
```javascript
// Performance Alerts
const PERFORMANCE_THRESHOLDS = {
  USER_LOOKUP_MS: 100,
  ROLE_INHERITANCE_MS: 50,
  NAMESPACE_SWITCH_MS: 200,
  BATCH_OPERATIONS_MS: 5000
};

// Health Check Endpoint
app.get('/health/namespace', async (c) => {
  const healthChecks = {
    database: await checkDatabasePerformance(),
    namespace_hierarchy: await checkNamespaceHierarchy(),
    role_inheritance: await checkRoleInheritance(),
    user_assignments: await checkUserAssignments()
  };
  
  const allHealthy = Object.values(healthChecks).every(check => check.status === 'ok');
  
  return c.json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks: healthChecks,
    timestamp: new Date().toISOString()
  }, allHealthy ? 200 : 500);
});
```

### 6.10 Erfolgskriterien:
- ✅ 100% Test-Coverage für Namespace-Funktionalität
- ✅ Alle User-Lookups unter 100ms
- ✅ Role-Inheritance-Queries unter 50ms
- ✅ 1000+ gleichzeitige Requests ohne Fehler
- ✅ Cross-Namespace-Isolation verifiziert
- ✅ Backward Compatibility bestätigt
- ✅ Performance-Monitoring in Produktion aktiv
- ✅ Load-Testing für 10.000+ User bestanden

## ROLLBACK PLAN & FEATURE FLAGS

### Feature Flag System (`src/config/features.js`)

**Graduelle Aktivierung des Namespace-Systems:**
```javascript
export const FeatureFlags = {
  NAMESPACE_SYSTEM_ENABLED: process.env.FEATURE_NAMESPACE_SYSTEM === 'true' || false,
  NAMESPACE_ENFORCEMENT: process.env.FEATURE_NAMESPACE_ENFORCEMENT === 'true' || false,
  NAMESPACE_UI_ENABLED: process.env.FEATURE_NAMESPACE_UI === 'true' || false,
  NAMESPACE_MIGRATION_MODE: process.env.NAMESPACE_MIGRATION_MODE || 'off', // off|read-only|active
};

// Feature Flag Middleware
export const checkFeatureFlag = (flag) => {
  return (c, next) => {
    if (!FeatureFlags[flag]) {
      return c.json({ 
        error: 'Feature not enabled',
        feature: flag
      }, 501);
    }
    return next();
  };
};

// Conditional Middleware Loading
export const conditionalMiddleware = (flag, middleware) => {
  return (c, next) => {
    if (FeatureFlags[flag]) {
      return middleware(c, next);
    }
    return next();
  };
};
```

### Rollback Strategie

**1. Database Rollback Script (`scripts/rollback-namespace-system.js`):**
```javascript
import { db } from '../src/db.js';

async function rollbackNamespaceSystem() {
  console.log('Starting namespace system rollback...');
  
  try {
    await db.transaction(async (trx) => {
      // 1. Restore user.role_id from user_namespace_roles
      console.log('Restoring user roles...');
      await trx.raw(`
        UPDATE users u
        SET role_id = unr.role_id
        FROM user_namespace_roles unr
        JOIN namespaces n ON unr.namespace_id = n.id
        WHERE u.id = unr.user_id AND n.parent_id IS NULL
      `);
      
      // 2. Remove namespace-specific columns
      console.log('Removing namespace columns...');
      await trx.schema.alterTable('roles', table => {
        table.dropColumn('origin_namespace_id');
      });
      
      // 3. Drop namespace tables
      console.log('Dropping namespace tables...');
      await trx.schema
        .dropTableIfExists('audit_logs')
        .dropTableIfExists('user_namespace_roles');
      
      // 4. Create rollback marker
      await trx('migrations').insert({
        name: 'namespace_system_rollback',
        batch: 999,
        migration_time: new Date()
      });
    });
    
    console.log('Rollback completed successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }
}

// Run rollback
rollbackNamespaceSystem();
```

**2. API Compatibility Layer:**
```javascript
// Maintain backward compatibility during transition
export const namespaceCompatibilityMiddleware = (c, next) => {
  if (FeatureFlags.NAMESPACE_SYSTEM_ENABLED) {
    return namespaceMiddleware(c, next);
  }
  
  // Fallback: Set dummy namespace context
  c.set('namespaceId', 'root');
  c.set('namespace', { id: 'root', name: 'Root' });
  return next();
};
```

**3. Monitoring & Alerts:**
```javascript
// Health check for namespace system
app.get('/health/namespace-system', async (c) => {
  const checks = {
    feature_flags: FeatureFlags,
    database_ready: await checkDatabaseMigrations(),
    namespace_count: await db('namespaces').count(),
    orphaned_users: await checkOrphanedUsers(),
    performance_metrics: await getNamespacePerformanceMetrics()
  };
  
  return c.json(checks);
});
```

### Deployment Phases

**Phase 1: Shadow Mode (Week 1-2)**
```env
FEATURE_NAMESPACE_SYSTEM=true
FEATURE_NAMESPACE_ENFORCEMENT=false
FEATURE_NAMESPACE_UI=false
NAMESPACE_MIGRATION_MODE=read-only
```
- System läuft parallel ohne Enforcement
- Logging und Monitoring aktiv
- Keine UI-Änderungen für User

**Phase 2: Beta Users (Week 3-4)**
```env
FEATURE_NAMESPACE_SYSTEM=true
FEATURE_NAMESPACE_ENFORCEMENT=true
FEATURE_NAMESPACE_UI=true
NAMESPACE_MIGRATION_MODE=active
BETA_USER_IDS=uuid1,uuid2,uuid3
```
- Ausgewählte User testen System
- Vollständige UI und Enforcement
- Feedback sammeln

**Phase 3: Gradual Rollout (Week 5-6)**
```env
ROLLOUT_PERCENTAGE=10  # Start with 10%, increase daily
```
- Prozentbasiertes Rollout
- Monitoring der Error-Rates
- Automatisches Rollback bei Problemen

**Phase 4: Full Production**
```env
FEATURE_NAMESPACE_SYSTEM=true
FEATURE_NAMESPACE_ENFORCEMENT=true
FEATURE_NAMESPACE_UI=true
NAMESPACE_MIGRATION_MODE=active
```

### Emergency Rollback Procedure

1. **Stop Application**
   ```bash
   pm2 stop proxmox-panel
   ```

2. **Set Rollback Mode**
   ```bash
   export FEATURE_NAMESPACE_SYSTEM=false
   export EMERGENCY_ROLLBACK=true
   ```

3. **Run Rollback Script**
   ```bash
   bun run scripts/rollback-namespace-system.js
   ```

4. **Restart with Old Code**
   ```bash
   git checkout pre-namespace-release
   bun install
   pm2 start proxmox-panel
   ```

5. **Verify System Health**
   ```bash
   curl http://localhost:3000/health
   ```

## KRITISCHE ERFOLGSFAKTOREN

### ✅ Non-Breaking Implementation
- **Backward Compatibility**: Bestehende APIs funktionieren ohne Änderungen
- **Graduelle Migration**: Jede Phase einzeln testbar
- **Rollback-Fähigkeit**: Jede Phase kann rückgängig gemacht werden

### ✅ Performance-First
- **Indexes**: Alle Namespace-Queries haben optimale Indexes
- **O(1) Lookups**: Keine rekursiven Permission-Checks
- **Caching**: Namespace-Hierarchie und Permission-Cache

### ✅ Security
- **Namespace-Isolation**: Strikte Trennung zwischen Tenants
- **Permission-Hierarchie**: Keine Privilege-Escalation möglich
- **Input-Validation**: Namespace-IDs werden validiert

### ✅ Developer Experience
- **Klare APIs**: Namespace-Kontext ist transparent verfügbar
- **Debugging**: Namespace-Kontext in Logs sichtbar
- **Testing**: Namespace-Szenarien sind testbar

## REIHENFOLGE DER IMPLEMENTIERUNG
1. **Tag 1**: Phase 1 (Database) + Phase 2 (Models)
2. **Tag 2**: Phase 3 (Middleware) + Phase 4 (Controllers)
3. **Tag 3**: Phase 5 (Frontend) + Phase 6 (Testing)

Jede Phase ist **in sich abgeschlossen** und **non-breaking**!