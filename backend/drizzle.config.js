import { defineConfig } from 'drizzle-kit';

// Bun reads .env automatically

const dbCredentials = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'), 
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME || 'proxmox_panel'
};

export default defineConfig({
  schema: './database/schemas/index.js',
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials,
  verbose: true,
  strict: true
});