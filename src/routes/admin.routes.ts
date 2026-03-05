import { Router } from 'express';
import { getAllUsers, deleteUser, getDashboardStats } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// GET /admin/users
router.get('/users', getAllUsers);

// DELETE /admin/users/:id
router.delete('/users/:id', deleteUser);

// GET /admin/stats
router.get('/stats', getDashboardStats);

export default router;
