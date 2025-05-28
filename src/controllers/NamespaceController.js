import Namespace from '../models/Namespace.js';
import { apiResponse } from '../utils/response.js';
import ValidationHelper from '../utils/ValidationHelper.js';

class NamespaceController {
  static async getNamespaces(c) {
    try {
      const includeTree = c.req.query('tree') === 'true';
      const namespaces = await Namespace.findAll({ includeTree });
      
      return c.json(apiResponse.success({
        namespaces,
        total: Array.isArray(namespaces) ? namespaces.length : namespaces.reduce((acc, root) => acc + this.countNodes(root), 0)
      }));
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      return c.json(apiResponse.error('Failed to fetch namespaces'), 500);
    }
  }

  static countNodes(node) {
    let count = 1;
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        count += this.countNodes(child);
      });
    }
    return count;
  }

  static async getNamespace(c) {
    try {
      const { id } = c.req.param();
      
      if (!ValidationHelper.isValidUUID(id)) {
        return c.json(apiResponse.error('Invalid namespace ID'), 400);
      }
      
      const namespace = await Namespace.findById(id);
      if (!namespace) {
        return c.json(apiResponse.notFound('Namespace not found'));
      }
      
      // Get additional info
      const [children, ancestors] = await Promise.all([
        Namespace.getChildren(id),
        Namespace.getAncestors(id)
      ]);
      
      return c.json(apiResponse.success({
        namespace: {
          ...namespace,
          children,
          ancestors
        }
      }));
    } catch (error) {
      console.error('Error fetching namespace:', error);
      return c.json(apiResponse.error('Failed to fetch namespace'), 500);
    }
  }

  static async createNamespace(c) {
    try {
      const body = await c.req.json();
      const { name, parent_id } = body;
      
      // Validation
      const validation = ValidationHelper.validateNamespace({ name });
      if (!validation.valid) {
        return c.json(apiResponse.validation({ name: validation.errors }), 400);
      }
      
      if (parent_id && !ValidationHelper.isValidUUID(parent_id)) {
        return c.json(apiResponse.error('Invalid parent ID'), 400);
      }
      
      const namespace = await Namespace.create({ name, parent_id });
      
      return c.json(apiResponse.success({
        namespace
      }, 'Namespace created successfully'), 201);
    } catch (error) {
      console.error('Error creating namespace:', error);
      
      if (error.message.includes('already exists')) {
        return c.json(apiResponse.error(error.message), 409);
      }
      if (error.message === 'Parent namespace not found') {
        return c.json(apiResponse.notFound(error.message));
      }
      
      return c.json(apiResponse.error('Failed to create namespace'), 500);
    }
  }

  static async updateNamespace(c) {
    try {
      const { id } = c.req.param();
      const body = await c.req.json();
      const { name } = body;
      
      if (!ValidationHelper.isValidUUID(id)) {
        return c.json(apiResponse.error('Invalid namespace ID'), 400);
      }
      
      // Validation
      const validation = ValidationHelper.validateNamespace({ name });
      if (!validation.valid) {
        return c.json(apiResponse.validation({ name: validation.errors }), 400);
      }
      
      const namespace = await Namespace.update(id, { name });
      
      return c.json(apiResponse.success({
        namespace
      }, 'Namespace updated successfully'));
    } catch (error) {
      console.error('Error updating namespace:', error);
      
      if (error.message === 'Namespace not found') {
        return c.json(apiResponse.notFound(error.message));
      }
      if (error.message.includes('already exists')) {
        return c.json(apiResponse.error(error.message), 409);
      }
      if (error.message.includes('Cannot update root')) {
        return c.json(apiResponse.forbidden(error.message));
      }
      
      return c.json(apiResponse.error('Failed to update namespace'), 500);
    }
  }

  static async deleteNamespace(c) {
    try {
      const { id } = c.req.param();
      
      if (!ValidationHelper.isValidUUID(id)) {
        return c.json(apiResponse.error('Invalid namespace ID'), 400);
      }
      
      await Namespace.delete(id);
      
      return c.json(apiResponse.success(null, 'Namespace deleted successfully'));
    } catch (error) {
      console.error('Error deleting namespace:', error);
      
      if (error.message === 'Namespace not found') {
        return c.json(apiResponse.notFound(error.message));
      }
      if (error.message.includes('with children')) {
        return c.json(apiResponse.error(error.message), 409);
      }
      if (error.message.includes('Cannot delete root')) {
        return c.json(apiResponse.forbidden(error.message));
      }
      
      return c.json(apiResponse.error('Failed to delete namespace'), 500);
    }
  }

  static async getNamespaceTree(c) {
    try {
      const { id } = c.req.param();
      
      if (!ValidationHelper.isValidUUID(id)) {
        return c.json(apiResponse.error('Invalid namespace ID'), 400);
      }
      
      const namespace = await Namespace.findById(id);
      if (!namespace) {
        return c.json(apiResponse.notFound('Namespace not found'));
      }
      
      // Get all descendants
      const allNamespaces = await Namespace.findAll();
      const descendants = allNamespaces.filter(ns => 
        ns.full_path.startsWith(namespace.full_path + '/') || ns.id === id
      );
      
      // Build tree from this namespace down
      const tree = Namespace.buildTree(descendants);
      
      return c.json(apiResponse.success({
        tree: tree.find(node => node.id === id) || { ...namespace, children: [] }
      }));
    } catch (error) {
      console.error('Error fetching namespace tree:', error);
      return c.json(apiResponse.error('Failed to fetch namespace tree'), 500);
    }
  }
}

export default NamespaceController;