# Namespace-Scoped Multi-Tenancy System

## AUFGABE
Bestehende Proxmox Panel App (Vue3 + Hono + MySQL) zu mandantenfähigem System erweitern. Jede Resource (User, Rollen) soll namespace-scoped werden für Multi-Tenant-Isolation.

## KERNLOGIK
- **User existiert nur in explizit zugewiesenen Namespaces** (via `user_namespace_roles` Records)
- **Rollen werden von Parent-Namespaces vererbt** - verfügbar in allen Sub-Namespaces, editierbar nur im Origin
- **Keine automatische Vererbung** für User-Zuweisungen - alle Zuweisungen sind bewusste, sichtbare DB-Records
- **Copy-Mechanismus** über UI für gewünschte "Vererbung" zu Sub-Namespaces
- **O(1) Performance** durch direkte DB-Lookups statt Rekursion

## KONZEPTUELLE GRUNDLAGEN

### Namespace-Hierarchie
- Namespaces bilden eine Baumstruktur mit beliebiger Tiefe
- Jeder Namespace hat genau einen Parent (außer Root)
- Namespaces können optional eine Domain zugeordnet bekommen
- Pfad-basierte Identifikation (z.B. `/root/company1/dept1`)

### User-Management
- User können in mehreren Namespaces existieren
- Pro Namespace hat ein User genau eine Rolle
- Keine implizite Vererbung - alle Zuweisungen sind explizit
- Copy-Mechanismus für "Vererbung" zu Sub-Namespaces

### Rollen-System
- Rollen haben einen Origin-Namespace
- Rollen sind in allen Sub-Namespaces des Origins verfügbar
- Bearbeitung nur im Origin-Namespace möglich
- Namespace-übergreifende Rollennamen möglich

### Permission-Model
- Permissions bleiben global definiert
- Rollen bündeln Permissions
- User-Permissions werden über Namespace-Rolle bestimmt
- Effiziente O(1) Lookups ohne Rekursion

## DESIGN-PRINZIPIEN

1. **Explizite Zuweisungen**: Keine versteckte Magie, alle Beziehungen sind sichtbare DB-Records
2. **Performance First**: Direkte Lookups statt rekursive Suchen
3. **Backward Compatibility**: Schrittweise Migration ohne Breaking Changes
4. **Audit Trail**: Alle kritischen Operationen werden geloggt
5. **Data Integrity**: RESTRICT-Constraints verhindern versehentliches Löschen
6. **UI/UX Focus**: Intuitive Workflows mit Copy-Checkboxen für häufige Operationen

## SICHERHEITSASPEKTE

- Namespace-Isolation auf DB-Ebene
- Keine Cross-Namespace-Zugriffe ohne explizite Zuweisung
- Audit-Logs für Compliance und Debugging
- Token-Scoping möglich (zukünftige Erweiterung)

## ERWEITERBARKEITSPUNKTE

- Domain-basiertes Routing für Multi-Domain-Setups
- API-Token-Scoping auf Namespace-Ebene
- Resource-Quotas pro Namespace
- Namespace-spezifische Settings/Konfigurationen
- Cross-Namespace-Sharing (mit expliziten Permissions)