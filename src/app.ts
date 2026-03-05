import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import slotRoutes from './routes/slot.routes';
import bookingRoutes from './routes/booking.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Cryonix Booking API is running',
        timestamp: new Date().toISOString(),
    });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/slots', slotRoutes);
app.use('/bookings', bookingRoutes);
app.use('/admin', adminRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
    });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
