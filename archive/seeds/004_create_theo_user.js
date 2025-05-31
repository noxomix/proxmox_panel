import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v7 as uuidv7 } from 'uuid';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Get role IDs
  const adminRole = await knex('roles').where('name', 'admin').first();
  const customerRole = await knex('roles').where('name', 'customer').first();
  
  if (!adminRole) {
    throw new Error('Admin role not found. Please run role seeds first.');
  }
  
  if (!customerRole) {
    throw new Error('Customer role not found. Please run role seeds first.');
  }
  
  // Hash the password with current environment APPLICATION_SECRET
  const saltRounds = 12;
  const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
  const hashedPassword = await bcrypt.hash('123' + pepper, saltRounds);
  
  console.log('Seeding users with APPLICATION_SECRET:', pepper);
  
  // Inserts seed entries - users to test all avatar types with international names
  const users = [
    // Admin user - German
    {
      id: uuidv7(),
      name: 'Theo',
      username: 'theo',
      email: 'theo@example.com',
      password_hash: hashedPassword,
      status: 'active'
    },
    // Customer users for avatar testing with international names
    // A-F = Giraffe - Estonian (Jaan Tamm equivalent)
    {
      id: uuidv7(),
      name: 'Anti Tamm',
      username: 'anti',
      email: 'anti@customer.com',
      password_hash: hashedPassword,
      status: 'active'
    },
    // G-L = Pinguin - Moldovan (Ion Popescu equivalent)
    {
      id: uuidv7(),
      name: 'Ion Popescu',
      username: 'ion',
      email: 'ion@customer.com',
      password_hash: hashedPassword,
      status: 'active'
    },
    // M-R = Wombat - Portuguese (João Silva equivalent)
    {
      id: uuidv7(),
      name: 'Manuel Silva',
      username: 'manuel',
      email: 'manuel@customer.com',
      password_hash: hashedPassword,
      status: 'active'
    },
    // S-Z = Gorilla - Ghanaian (Kwame Asante equivalent)
    {
      id: uuidv7(),
      name: 'Samuel Asante',
      username: 'samuel',
      email: 'samuel@customer.com',
      password_hash: hashedPassword,
      status: 'active'
    },
    // Extra user - Uruguayan (Juan Pérez equivalent)
    {
      id: uuidv7(),
      name: 'Carlos Pérez',
      username: 'carlos',
      email: 'carlos@customer.com',
      password_hash: hashedPassword,
      status: 'active'
    },
    // Extra user - Slovak (Ján Novák equivalent)
    {
      id: uuidv7(),
      name: 'Ján Novák',
      username: 'jan',
      email: 'jan@customer.com',
      password_hash: hashedPassword,
      status: 'active'
    }
  ];
  
  await knex('users').insert(users);
  
  // Get root namespace
  const rootNamespace = await knex('namespaces').where('name', 'root').first();
  if (!rootNamespace) {
    throw new Error('Root namespace not found. Please run namespace seeds first.');
  }
  
  // Create user_namespace_roles assignments
  const userRoleAssignments = [
    // Theo gets admin role
    {
      user_id: users[0].id, // Theo
      namespace_id: rootNamespace.id,
      role_id: adminRole.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    // All others get customer role
    {
      user_id: users[1].id, // Anti
      namespace_id: rootNamespace.id,
      role_id: customerRole.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      user_id: users[2].id, // Ion
      namespace_id: rootNamespace.id,
      role_id: customerRole.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      user_id: users[3].id, // Manuel
      namespace_id: rootNamespace.id,
      role_id: customerRole.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      user_id: users[4].id, // Samuel
      namespace_id: rootNamespace.id,
      role_id: customerRole.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      user_id: users[5].id, // Carlos
      namespace_id: rootNamespace.id,
      role_id: customerRole.id,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      user_id: users[6].id, // Jan
      namespace_id: rootNamespace.id,
      role_id: customerRole.id,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  await knex('user_namespace_roles').insert(userRoleAssignments);
  
  console.log('Users seeded successfully:');
  console.log('- theo (admin, German) - password "123"');
  console.log('- anti (customer, Estonian, giraffe avatar) - password "123"');
  console.log('- ion (customer, Moldovan, pinguin avatar) - password "123"');
  console.log('- manuel (customer, Portuguese, wombat avatar) - password "123"');
  console.log('- samuel (customer, Ghanaian, gorilla avatar) - password "123"');
  console.log('- carlos (customer, Uruguayan) - password "123"');
  console.log('- jan (customer, Slovak) - password "123"');
};