import { Router } from 'express';
import {
    createSlot,
    getAllSlots,
    getMySlots,
    deleteSlot,
} from '../controllers/slot.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// GET /slots  - List all slots (authenticated users)
router.get('/', authenticate, getAllSlots);

// POST /slots  - Create a slot (PROVIDER only)
router.post('/', authenticate, authorize('PROVIDER', 'ADMIN'), createSlot);

// GET /slots/my  - Get provider's own slots (PROVIDER only)
router.get('/my', authenticate, authorize('PROVIDER', 'ADMIN'), getMySlots);

// DELETE /slots/:id  - Delete a slot (PROVIDER / ADMIN only)
router.delete('/:id', authenticate, authorize('PROVIDER', 'ADMIN'), deleteSlot);

export default router;
