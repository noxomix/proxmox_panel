# Konkrete Umsetzungsschritte für Multi-Tenancy

## PHASE 1: DATENBANK-ERWEITERUNG

### 1.1 Migration für user_namespace_roles Tabelle
- Neue Knex-Migration erstellen
- Tabelle mit user_id, namespace_id, role_id als composite Primary Key
- Foreign Keys mit RESTRICT für Datenintegrität
- Performance-Indizes hinzufügen

### 1.3 Roles-Tabelle erweitern
- Migration für origin_namespace_id Spalte in roles
- Unique Constraint für Rollenname pro Namespace
- Bestehende Rollen dem Root-Namespace zuweisen
- Index für Performance-Optimierung

## PHASE 2: MODELS ERWEITERN

### 2.1 User Model anpassen
- **Aktuell**: User hat direkte role_id Spalte in users Tabelle
- **Neu**: Many-to-Many Beziehung über user_namespace_roles Tabelle

#### User.getRoleInNamespace(namespaceId)
- **Zweck**: Convenience-Wrapper für user-zentrierte Abfragen
- **Implementation**: Ruft UserNamespaceRole.getRoleForUser(this.id, namespaceId) auf
- **Return**: Role Object oder null (falls User nicht in diesem Namespace existiert)
- **Vorteil**: Objekt-orientierte API ohne direkte UserNamespaceRole-Abhängigkeit

#### User.getNamespaces()
- **Zweck**: Alle Namespaces auflisten in denen der User Zugriff hat
- **Implementation**: Ruft UserNamespaceRole.findByUser(this.id) auf
- **Return**: Array von Namespace Objects mit jeweiliger Rolle
- **Format**: [{namespace: {id, name, full_path}, role: {id, name, display_name}}]
- **Nutzen**: Für Namespace-Switcher im Frontend

#### User.assignToNamespace(namespaceId, roleId)
- **Zweck**: Convenience-Wrapper für User-Zuweisungen
- **Implementation**: Ruft UserNamespaceRole.create(this.id, namespaceId, roleId) auf
- **Validation**: Delegation an UserNamespaceRole für konsistente Validierung
- **Vorteil**: User-zentrierte API ohne Preisgabe der Implementierung

#### User.hasPermissionInNamespace(permission, namespaceId)
- **Aktuell**: hasPermission() prüft nur über users.role_id global
- **Neu**: Prüft Permission über user_namespace_roles → roles → role_permissions
- **Query Chain**: user_namespace_roles → roles → role_permissions → permissions
- **Logic**: WHERE user_id AND namespace_id AND permission.name = ?
- **Return**: Boolean
- **Performance**: O(1) durch direkte Joins statt Rekursion

### 2.2 Role Model erweitern
- **Neu**: Role.getAvailableInNamespace(namespaceId) - zeigt vererbte + eigene Rollen
- **Neu**: Role.isEditableInNamespace(namespaceId) - prüft Origin-Namespace
- **Neu**: Role.getOriginNamespace() Methode
- **Aktuell**: Role.findAll() zeigt alle Rollen
- **Neu**: Namespace-Filter in findAll() einbauen

### 2.3 Namespace Model erweitern
- **Neu**: Namespace.getUsersWithRoles(namespaceId) Methode
- **Neu**: Namespace.getAvailableRoles(namespaceId) - eigene + vererbte
- **Neu**: Namespace.getAncestorRoles(namespaceId) für Vererbung
- **Neu**: Namespace.copyUsersFromParent(namespaceId) Methode

### 2.4 UserNamespaceRole Model erstellen
- **Zweck**: Direkte Manipulation der user_namespace_roles Tabelle
- **Fokus**: Beziehungs-Management zwischen User, Namespace und Role

#### UserNamespaceRole.create(userId, namespaceId, roleId)
- **Action**: INSERT INTO user_namespace_roles
- **Validation**: Prüft Existenz von User, Namespace und Role
- **Constraint**: Enforcement der eindeutigen User-Namespace-Kombination
- **Error Handling**: Wirft spezifische Fehler bei Constraint-Verletzungen

#### UserNamespaceRole.findByUser(userId)
- **Query**: SELECT mit JOINs zu namespaces und roles
- **Return**: Array aller Namespace-Role-Zuweisungen für User
- **Format**: [{namespace_id, namespace_name, role_id, role_name}]
- **Nutzen**: Effiziente Bulk-Abfrage ohne User-Objekt zu laden

#### UserNamespaceRole.findByNamespace(namespaceId)
- **Query**: SELECT mit JOINs zu users und roles
- **Return**: Array aller User-Role-Zuweisungen für Namespace
- **Format**: [{user_id, username, role_id, role_name}]
- **Nutzen**: Namespace-Management-Views im Frontend

#### UserNamespaceRole.copyUsersToNamespace(fromNamespaceId, toNamespaceId)
- **Zweck**: Bulk-Operation für "Parent-User übernehmen" Feature
- **Query**: INSERT INTO user_namespace_roles SELECT FROM user_namespace_roles WHERE namespace_id = fromNamespaceId
- **Target**: toNamespaceId mit identischen role_id Zuweisungen
- **Performance**: Effiziente Bulk-Copy ohne einzelne User-Queries

#### UserNamespaceRole.bulkAssign(userIds, namespaceId, roleId)
- **Zweck**: Mehrere User gleichzeitig einem Namespace zuweisen
- **Query**: Batch INSERT mit Array von user_ids
- **Validation**: Prüft alle User-IDs vor Bulk-Operation
- **Use Case**: "Alle markierten User zu Namespace hinzufügen"

#### UserNamespaceRole.deleteByUser(userId, namespaceId)
- **Action**: DELETE FROM user_namespace_roles WHERE user_id AND namespace_id
- **Zweck**: User aus spezifischem Namespace entfernen
- **Cascade**: Keine - User bleibt in anderen Namespaces erhalten

#### UserNamespaceRole.updateRole(userId, namespaceId, newRoleId)
- **Action**: UPDATE user_namespace_roles SET role_id WHERE user_id AND namespace_id
- **Validation**: Prüft ob newRoleId in Namespace verfügbar ist
- **Use Case**: Role-Änderung ohne Delete/Insert

## PHASE 3: MIDDLEWARE UND AUTH ANPASSEN

### 3.1 Auth Middleware erweitern
- **Aktuell**: auth.js prüft nur User-Existenz und Token-Gültigkeit
- **Neu**: Namespace-Context aus Request extrahieren (Header/Domain/Path)
- **Neu**: User-Berechtigung für spezifischen Namespace prüfen
- **Neu**: req.user.currentNamespace und req.user.currentRole setzen

### 3.2 Permission Middleware anpassen
- **Aktuell**: permissions.js prüft globale User-Permissions
- **Neu**: Namespace-Parameter für Permission-Checks verwenden
- **Neu**: hasPermissionInNamespace() statt hasPermission() verwenden
- **Neu**: Namespace-spezifische Permission-Denial-Messages

### 3.3 Namespace-Switching Middleware
- Neues Middleware für Namespace-Kontext-Wechsel
- Domain-basierte Namespace-Erkennung
- Fallback auf Standard-Namespace für unbekannte Domains

## PHASE 4: CONTROLLERS ANPASSEN

### 4.1 UserController erweitern
- **Aktuell**: getUsers() zeigt alle User global
- **Neu**: getUsers() filtert nach aktuellem Namespace
- **Aktuell**: createUser() erstellt User mit globaler Rolle
- **Neu**: createUser() erstellt User-Namespace-Role Record
- **Neu**: assignUserToNamespace() Endpunkt hinzufügen
- **Neu**: removeUserFromNamespace() Endpunkt hinzufügen
- **Neu**: copyUserToSubNamespaces() Endpunkt hinzufügen
- **Aktuell**: updateUser() ändert globale role_id
- **Neu**: updateUser() ändert Role nur für aktuellen Namespace

### 4.2 RoleController erweitern
- **Aktuell**: getRoles() zeigt alle Rollen
- **Neu**: getRoles() zeigt vererbte + namespace-eigene Rollen
- **Aktuell**: createRole() erstellt globale Rolle
- **Neu**: createRole() setzt origin_namespace_id auf aktuellen Namespace
- **Aktuell**: updateRole() kann alle Rollen ändern
- **Neu**: updateRole() nur für Rollen mit passendem Origin-Namespace
- **Aktuell**: deleteRole() kann alle Rollen löschen
- **Neu**: deleteRole() nur für eigene Rollen, prüft Dependencies

### 4.3 NamespaceController erweitern
- **Neu**: getUsersInNamespace() Endpunkt hinzufügen
- **Neu**: getNamespaceRoles() für verfügbare Rollen
- **Neu**: copyParentUsers() beim Namespace-Create
- **Aktuell**: createNamespace() erstellt nur Namespace-Record
- **Neu**: Optional Parent-User kopieren bei Creation

### 4.4 ProfileController anpassen
- **Aktuell**: me() zeigt User mit globaler Rolle
- **Neu**: me() zeigt User mit Rolle für aktuellen Namespace
- **Neu**: getMyNamespaces() für verfügbare Namespaces
- **Neu**: switchNamespace() für Namespace-Wechsel

## PHASE 5: FRONTEND ANPASSUNGEN

### 5.1 Auth Store erweitern
- **Aktuell**: user Store hat globale role
- **Neu**: currentNamespace und currentRole State hinzufügen
- **Neu**: switchNamespace() Action für Namespace-Wechsel
- **Neu**: getPermissionsInNamespace() Getter

### 5.2 User Management Views anpassen
- **Aktuell**: Users.vue zeigt alle User
- **Neu**: Nur User des aktuellen Namespace zeigen
- **Aktuell**: UserModal hat globale Rollen-Auswahl
- **Neu**: Namespace-verfügbare Rollen anzeigen (eigene + vererbte)
- **Neu**: "Zu Sub-Namespaces kopieren" Checkbox hinzufügen

### 5.3 Role Management Views anpassen
- **Aktuell**: Roles.vue zeigt alle Rollen
- **Neu**: Vererbte Rollen grau/readonly, eigene editierbar anzeigen
- **Aktuell**: RoleModal kann alle Rollen bearbeiten
- **Neu**: Nur Rollen mit passendem Origin-Namespace editierbar
- **Neu**: Origin-Namespace-Info in Role-Anzeige

### 5.4 Namespace Management erweitern
- **Aktuell**: Namespaces.vue zeigt nur Namespace-Baum
- **Neu**: User-Assignments pro Namespace anzeigen
- **Neu**: "Parent-User übernehmen" bei Namespace-Creation
- **Neu**: Bulk-User-Assignment-Features

### 5.5 Navigation erweitern
- **Aktuell**: Namespace-Selector nur im Sidebar
- **Neu**: Aktiver Namespace in Header/Breadcrumb anzeigen
- **Neu**: Namespace-Switch-Confirmation bei Kontext-Wechsel
- **Neu**: Permission-basierte Navigation pro Namespace

## PHASE 6: MIGRATION UND DATEN-ÜBERGANG

### 6.1 Bestehende User-Role-Zuweisungen migrieren
- Alle User mit aktueller role_id analysieren
- User-Namespace-Role Records für Root-Namespace erstellen
- Alte role_id Spalte als deprecated markieren (nicht löschen)

### 6.2 Bestehende Rollen dem Root-Namespace zuweisen
- Alle roles.origin_namespace_id auf Root-Namespace setzen
- Validierung dass alle Rollen korrekt zugewiesen sind

### 6.3 Test-Namespaces und Test-Zuweisungen erstellen
- Sub-Namespaces für Testing anlegen
- Test-User mit verschiedenen Namespace-Zuweisungen
- Rollenvererbung testen

## PHASE 7: VALIDIERUNG UND ROLLBACK-SICHERHEIT

### 7.1 Backward-Compatibility sicherstellen
- Alte API-Endpunkte weiterhin funktionsfähig
- Graceful Degradation bei fehlendem Namespace-Context
- Fallback auf Root-Namespace bei Legacy-Requests

### 7.2 Rollback-Mechanismus
- Migration-Rollback-Skripte vorbereiten
- Feature-Flags für schrittweise Aktivierung
- Monitoring für Performance-Impact

### 7.3 Testing-Strategie
- Unit-Tests für alle neuen Model-Methoden
- Integration-Tests für Namespace-Isolation
- E2E-Tests für komplette User-Workflows