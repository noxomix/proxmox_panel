#!/usr/bin/env bun
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from '../config/database.js';

async function rollback() {
  console.log('🔄 Starting database rollback...');
  
  try {
    const rollbackDir = join(process.cwd(), 'migrations', 'down');
    const files = await readdir(rollbackDir);
    
    // Filter and sort rollback files in reverse order (highest number first)
    const rollbackFiles = files
      .filter(file => file.endsWith('.sql') && !file.startsWith('.'))
      .sort()
      .reverse();
    
    console.log(`📄 Found ${rollbackFiles.length} rollback files`);
    
    for (const file of rollbackFiles) {
      console.log(`⏳ Running rollback: ${file}`);
      
      const filePath = join(rollbackDir, file);
      const sql = await readFile(filePath, 'utf8');
      
      // Execute the rollback statement
      const cleanStatement = sql.trim();
      if (cleanStatement) {
        await pool.execute(cleanStatement);
      }
      
      console.log(`✅ Completed rollback: ${file}`);
    }
    
    console.log('🎉 All rollbacks completed successfully!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

rollback();