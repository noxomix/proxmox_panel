#!/usr/bin/env bun
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from '../config/database.js';

async function migrate() {
  console.log('🚀 Starting database migration...');
  
  try {
    const migrationsDir = join(process.cwd(), 'migrations');
    const files = await readdir(migrationsDir);
    
    // Filter and sort migration files
    const migrationFiles = files
      .filter(file => file.endsWith('.sql') && !file.startsWith('.'))
      .sort();
    
    console.log(`📄 Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`⏳ Running migration: ${file}`);
      
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf8');
      
      // Split by statement breakpoint and execute each statement
      const statements = sql.split('--> statement-breakpoint').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        const cleanStatement = statement.trim();
        if (cleanStatement) {
          await pool.execute(cleanStatement);
        }
      }
      
      console.log(`✅ Completed migration: ${file}`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();