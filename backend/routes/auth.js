import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth.js';

// Import single-function controllers
import Login from '../controllers/AuthController/Login.js';
import Logout from '../controllers/AuthController/Logout.js';
import GetProfile from '../controllers/AuthController/GetProfile.js';
import GetMe from '../controllers/AuthController/GetMe.js';

const auth = new Hono();

// Public routes
auth.post('/login', Login);

// Protected routes
auth.use('*', authMiddleware);
auth.post('/logout', Logout);
auth.get('/profile', GetProfile);
auth.get('/me', GetMe);

export { auth as authRoutes };