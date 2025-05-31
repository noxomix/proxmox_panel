#!/usr/bin/env bun
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from '../config/database.js';

async function rollback() {
  console.log('🔄 Starting database rollback...');
  
  try {
    const rollbackDir = join(process.cwd(), 'database/migrations', 'down');
    const files = await readdir(rollbackDir);
    
    // Define proper rollback order based on foreign key dependencies
    // Child tables first, parent tables last
    const rollbackOrder = [
      '0007_drop_role_permissions_table.sql',     // FK: roles + permissions
      '0005_drop_user_namespace_roles_table.sql', // FK: users + namespaces + roles
      '0000_drop_tokens_table.sql',               // FK: users
      '0004_drop_roles_namespaces_table.sql',     // FK: roles + namespaces
      '0003_drop_roles_table.sql',                // FK: namespaces
      '0002_drop_users_table.sql',                // FK: namespaces
      '0006_drop_permissions_table.sql',          // standalone
      '0001_drop_namespaces_table.sql'            // root parent
    ];
    
    // Filter to only include existing files in the correct order
    const rollbackFiles = rollbackOrder.filter(file => 
      files.includes(file)
    );
    
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