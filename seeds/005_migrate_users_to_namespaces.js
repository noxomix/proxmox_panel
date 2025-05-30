/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export async function seed(knex) {
  console.log('🔄 Migrating existing users to namespace system...');
  
  // Get root namespace
  const rootNamespace = await knex('namespaces')
    .where({ parent_id: null })
    .first();
    
  if (!rootNamespace) {
    throw new Error('Root namespace not found. Please run namespace seed first.');
  }
  
  // Get all users with their current role_id
  const users = await knex('users')
    .whereNotNull('role_id')
    .select('id', 'name', 'username', 'role_id');
    
  console.log(`📋 Found ${users.length} users to migrate`);
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const user of users) {
    try {
      // Check if user is already assigned to root namespace
      const existing = await knex('user_namespace_roles')
        .where({
          user_id: user.id,
          namespace_id: rootNamespace.id
        })
        .first();
        
      if (existing) {
        console.log(`⏭️  User ${user.username} already assigned to root namespace`);
        skippedCount++;
        continue;
      }
      
      // Assign user to root namespace with their current role
      await knex('user_namespace_roles').insert({
        user_id: user.id,
        namespace_id: rootNamespace.id,
        role_id: user.role_id,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log(`✅ Migrated user ${user.username} to root namespace with role ${user.role_id}`);
      migratedCount++;
      
    } catch (error) {
      console.error(`❌ Failed to migrate user ${user.username}:`, error.message);
    }
  }
  
  console.log(`🎉 Migration complete: ${migratedCount} users migrated, ${skippedCount} skipped`);
  
  // Optional: Clean up old role_id column values (commented out for safety)
  // console.log('🧹 Cleaning up old role_id column...');
  // await knex('users').update({ role_id: null });
  // console.log('✅ Old role_id values cleared');
}