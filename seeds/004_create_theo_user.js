import 'dotenv/config';
import bcrypt from 'bcrypt';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Get admin role ID
  const adminRole = await knex('roles').where('name', 'admin').first();
  
  if (!adminRole) {
    throw new Error('Admin role not found. Please run role seeds first.');
  }
  
  // Hash the password with current environment APPLICATION_SECRET
  const saltRounds = 12;
  const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
  const hashedPassword = await bcrypt.hash('123' + pepper, saltRounds);
  
  console.log('Seeding user with APPLICATION_SECRET:', pepper);
  
  // Inserts seed entries
  await knex('users').insert([
    {
      name: 'theo',
      username: 'theo',
      email: 'theo@example.com',
      role_id: adminRole.id,
      password_hash: hashedPassword,
      status: 'active'
    }
  ]);
  
  console.log('User "theo" seeded successfully with password "123"');
};