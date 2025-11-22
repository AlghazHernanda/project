import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /auth/register
 * Body: { username, email, password, full_name? }
 * Response: { success, message, data: { token, user } }
 */
router.post('/register', register);

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { success, message, data: { token, user } }
 */
router.post('/login', login);

/**
 * GET /auth/profile
 * Headers: Authorization: Bearer <token>
 * Response: { success, message, data: { user } }
 * Memerlukan autentikasi (bearer token)
 */
router.get('/profile', verifyToken, getProfile);

export default router;
