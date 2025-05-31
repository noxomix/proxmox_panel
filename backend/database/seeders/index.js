#!/usr/bin/env bun

import { seedNamespaces } from './001_seed_namespaces.js';
import { seedPermissions } from './003_seed_permissions.js';
import { seedRoles } from './002_seed_roles.js';
import { seedUsers } from './004_seed_users.js';

export const runAllSeeders = async () => {
  console.log('🚀 Starting database seeding...\n');
  
  try {
    // 1. Seed namespaces first (no dependencies)
    await seedNamespaces();
    console.log('');
    
    // 2. Seed permissions (no dependencies)
    await seedPermissions();
    console.log('');
    
    // 3. Seed roles and assign permissions (depends on namespaces + permissions)
    await seedRoles();
    console.log('');
    
    // 4. Seed users and assign roles (depends on namespaces + roles)
    await seedUsers();
    console.log('');
    
    console.log('🎉 All seeders completed successfully!');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.main) {
  await runAllSeeders();
  process.exit(0);
}