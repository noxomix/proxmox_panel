## 2.1 User Model anpassen
- **Aktuell**: User hat direkte role_id Spalte in users Tabelle
- **Neu**: Many-to-Many Beziehung über user_namespace_roles Tabelle habs gerde vershetlich abgebrochen also mach da weiter wo du aufgehört hast

## Projekt Konfiguration
- Backend: Bun-Projekt mit Hono.js
- Fokus auf Hono.js Standards und Bibliotheken (z.B. hono/jwt)
- Ziel: Stabile, Production-Grade Anwendung
- Datenbank: MySQL (MariaDB) mit Drizzle ORM
- Projektstruktur:
  - `/backend`: Server-Komponenten
  - `/frontend`: Vue Frontend
  - `/archive`: Altes Projekt (nicht als Strukturvorlage)
- Hauptverzeichnis `package.json` für Projekt-Steuerung (z.B. `bun dev`)
- Strikte Einhaltung der Vorgaben, keine Eigeninitiative über Anforderungen hinaus