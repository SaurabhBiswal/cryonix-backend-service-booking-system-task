import { Router } from 'express';
import {
    createBooking,
    confirmPayment,
    getMyBookings,
    getAllBookings,
} from '../controllers/booking.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// POST /bookings  - Book a slot (CUSTOMER only)
router.post('/', authenticate, authorize('CUSTOMER', 'ADMIN'), createBooking);

// POST /bookings/confirm-payment  - Confirm payment for a booking
router.post('/confirm-payment', authenticate, confirmPayment);

// GET /bookings/my  - Get customer's own bookings
router.get('/my', authenticate, authorize('CUSTOMER', 'ADMIN'), getMyBookings);

// GET /bookings  - Get all bookings (ADMIN only)
router.get('/', authenticate, authorize('ADMIN'), getAllBookings);

export default router;
