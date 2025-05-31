import { v7 as uuidv7 } from 'uuid';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export async function seed(knex) {
  // Check if root namespace already exists
  const rootNamespace = await knex('namespaces')
    .where({ name: process.env.ROOT_NAMESPACE || 'root', parent_id: null })
    .first();
  
  if (!rootNamespace) {
    // Create root namespace
    await knex('namespaces').insert({
      id: uuidv7(),
      name: process.env.ROOT_NAMESPACE || 'root',
      parent_id: null,
      full_path: process.env.ROOT_NAMESPACE || 'root',
      depth: 0,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('✅ Root namespace created');
  } else {
    console.log('ℹ️  Root namespace already exists');
  }
}