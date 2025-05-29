import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

class Namespace {
  static tableName = 'namespaces';

  static async findAll({ includeTree = false } = {}) {
    const namespaces = await db(this.tableName)
      .select('*')
      .orderBy('full_path');
    
    if (includeTree) {
      return this.buildTree(namespaces);
    }
    
    return namespaces;
  }

  static async findById(id) {
    return db(this.tableName)
      .where({ id })
      .first();
  }

  static async findByPath(fullPath) {
    return db(this.tableName)
      .where({ full_path: fullPath })
      .first();
  }

  static async create({ name, parent_id = null }) {
    const id = uuidv4();
    let full_path = name;
    let depth = 0;
    
    // If parent exists, calculate full path and depth
    if (parent_id) {
      const parent = await this.findById(parent_id);
      if (!parent) {
        throw new Error('Parent namespace not found');
      }
      full_path = `${parent.full_path}/${name}`;
      depth = parent.depth + 1;
    }
    
    // Check if name already exists at this level
    const existing = await db(this.tableName)
      .where({ name, parent_id })
      .first();
    
    if (existing) {
      throw new Error('A namespace with this name already exists at this level');
    }
    
    await db(this.tableName)
      .insert({
        id,
        name,
        parent_id,
        full_path,
        depth
      });
    
    return this.findById(id);
  }

  static async update(id, { domain }) {
    const namespace = await this.findById(id);
    if (!namespace) {
      throw new Error('Namespace not found');
    }
    
    // Check if it's the root namespace
    if (!namespace.parent_id && namespace.name === (process.env.ROOT_NAMESPACE || 'root')) {
      throw new Error('Cannot update root namespace');
    }
    
    // Only domain can be updated, not name
    const updateData = {};
    if (domain !== undefined) {
      updateData.domain = domain || null; // Allow null to remove domain
    }
    
    await db(this.tableName)
      .where({ id })
      .update(updateData);
    
    return this.findById(id);
  }

  static async delete(id) {
    const namespace = await this.findById(id);
    if (!namespace) {
      throw new Error('Namespace not found');
    }
    
    // Check if namespace is root
    if (!namespace.parent_id && namespace.name === (process.env.ROOT_NAMESPACE || 'root')) {
      throw new Error('Cannot delete root namespace');
    }
    
    // Check if namespace has children
    const childCount = await db(this.tableName)
      .where({ parent_id: id })
      .count('id as count')
      .first();
    
    if (childCount.count > 0) {
      throw new Error('Cannot delete namespace with children');
    }
    
    await db(this.tableName)
      .where({ id })
      .delete();
    
    return { success: true };
  }

  static async getChildren(parentId) {
    return db(this.tableName)
      .where({ parent_id: parentId })
      .orderBy('name');
  }

  static async getAncestors(id) {
    const namespace = await this.findById(id);
    if (!namespace) {
      return [];
    }
    
    const ancestors = [];
    let current = namespace;
    
    while (current.parent_id) {
      current = await this.findById(current.parent_id);
      if (current) {
        ancestors.unshift(current);
      }
    }
    
    return ancestors;
  }

  static buildTree(flatList) {
    const map = {};
    const roots = [];
    
    // Create a map of all namespaces
    flatList.forEach(ns => {
      map[ns.id] = { ...ns, children: [] };
    });
    
    // Build the tree structure
    flatList.forEach(ns => {
      if (ns.parent_id && map[ns.parent_id]) {
        map[ns.parent_id].children.push(map[ns.id]);
      } else if (!ns.parent_id) {
        roots.push(map[ns.id]);
      }
    });
    
    return roots;
  }

  static async validateHierarchy(parentId, childId) {
    // Prevent circular references
    if (parentId === childId) {
      return false;
    }
    
    let currentId = parentId;
    while (currentId) {
      const current = await this.findById(currentId);
      if (!current) break;
      
      if (current.parent_id === childId) {
        return false; // Would create circular reference
      }
      
      currentId = current.parent_id;
    }
    
    return true;
  }

  // Namespace-aware user and role management methods

  static async getUsersWithRoles(namespaceId) {
    return await db('user_namespace_roles')
      .join('users', 'user_namespace_roles.user_id', 'users.id')
      .join('roles', 'user_namespace_roles.role_id', 'roles.id')
      .where('user_namespace_roles.namespace_id', namespaceId)
      .select(
        'users.id as user_id',
        'users.name as user_name',
        'users.username',
        'users.email',
        'users.status',
        'roles.id as role_id',
        'roles.name as role_name',
        'roles.display_name as role_display_name'
      )
      .orderBy('users.name');
  }

  static async getAvailableRoles(namespaceId) {
    // Get target namespace for inheritance calculation
    const targetNamespace = await this.findById(namespaceId);
    if (!targetNamespace) {
      return [];
    }

    return await db('roles')
      .leftJoin('namespaces as origin_ns', 'roles.origin_namespace_id', 'origin_ns.id')
      .where(function() {
        this.where('roles.origin_namespace_id', namespaceId) // Own roles
          .orWhere(function() {
            // Inherited roles - role's origin is ancestor of target namespace
            this.whereRaw('? LIKE CONCAT(origin_ns.full_path, "/%")', [targetNamespace.full_path])
              .orWhere('origin_ns.parent_id', null); // Root namespace roles
          });
      })
      .select('roles.*', 'origin_ns.name as origin_namespace_name', 'origin_ns.full_path as origin_namespace_path')
      .orderBy('roles.name');
  }

  static async getAncestorRoles(namespaceId) {
    const ancestors = await this.getAncestors(namespaceId);
    const ancestorIds = ancestors.map(ancestor => ancestor.id);
    
    if (ancestorIds.length === 0) {
      return [];
    }

    return await db('roles')
      .leftJoin('namespaces as origin_ns', 'roles.origin_namespace_id', 'origin_ns.id')
      .whereIn('roles.origin_namespace_id', ancestorIds)
      .select('roles.*', 'origin_ns.name as origin_namespace_name', 'origin_ns.full_path as origin_namespace_path')
      .orderBy('roles.name');
  }

  static async copyUsersFromParent(namespaceId) {
    const namespace = await this.findById(namespaceId);
    if (!namespace || !namespace.parent_id) {
      throw new Error('Namespace not found or has no parent');
    }

    // Get all users from parent namespace
    const parentUsers = await this.getUsersWithRoles(namespace.parent_id);
    
    if (parentUsers.length === 0) {
      return { copied: 0, skipped: 0, errors: [] };
    }

    let copied = 0;
    let skipped = 0;
    const errors = [];

    await db.transaction(async (trx) => {
      for (const user of parentUsers) {
        try {
          // Check if user already exists in target namespace
          const existing = await trx('user_namespace_roles')
            .where({
              user_id: user.user_id,
              namespace_id: namespaceId
            })
            .first();

          if (existing) {
            skipped++;
            continue;
          }

          // Copy user with same role to target namespace
          await trx('user_namespace_roles').insert({
            user_id: user.user_id,
            namespace_id: namespaceId,
            role_id: user.role_id
          });

          copied++;
        } catch (error) {
          errors.push({
            user_id: user.user_id,
            user_name: user.user_name,
            error: error.message
          });
        }
      }
    });

    return { copied, skipped, errors };
  }
}

export default Namespace;