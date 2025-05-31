#!/usr/bin/env bun
import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(spawn);

async function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Running ${scriptName}...`);
    
    const child = spawn('bun', ['run', scriptName], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scriptName} completed successfully`);
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function fresh() {
  console.log('🔄 Starting fresh database setup...');
  console.log('⚠️  This will rollback all tables and run all migrations!');
  
  try {
    // Step 1: Rollback the database
    await runScript('db:rollback');
    
    // Step 2: Run migrations
    await runScript('db:migrate');
    
    console.log('\n🎉 Fresh database setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Fresh database setup failed:', error.message);
    process.exit(1);
  }
}

fresh();