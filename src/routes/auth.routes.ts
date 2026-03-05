import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// POST /auth/register
router.post('/register', register);

// POST /auth/login
router.post('/login', login);

// GET /auth/profile  (protected)
router.get('/profile', authenticate, getProfile);

export default router;
