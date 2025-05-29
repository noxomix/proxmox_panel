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
}

export default Namespace;