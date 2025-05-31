import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';

// Import single-function controllers
import IndexUsers from '../controllers/UserController/IndexUsers.js';
import CreateUser from '../controllers/UserController/CreateUser.js';
import UpdateUser from '../controllers/UserController/UpdateUser.js';
import DeleteUser from '../controllers/UserController/DeleteUser.js';
import GetUserPermissions from '../controllers/UserController/GetUserPermissions.js';

const users = new Hono();

// All user routes require authentication
users.use('*', authMiddleware);

// User CRUD routes
users.get('/', IndexUsers);
users.post('/', CreateUser);
users.put('/:id', UpdateUser);
users.delete('/:id', DeleteUser);
users.get('/:id/permissions', GetUserPermissions);

export { users as userRoutes };