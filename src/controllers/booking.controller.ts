import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { createBookingSchema, confirmPaymentSchema } from '../validators/booking.validator';

/**
 * Create a booking for an available slot.
 *
 * Double-booking prevention strategy:
 * We use a Prisma interactive transaction combined with a raw SQL `SELECT FOR UPDATE`
 * to acquire a row-level lock on the slot before checking its status. This ensures
 * that in a concurrent environment, only one request can hold the lock at a time,
 * preventing two customers from booking the same slot simultaneously.
 */
export const createBooking = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const parsed = createBookingSchema.safeParse(req.body);
        if (!parsed.success) {
            next(createError(parsed.error.issues.map((e) => e.message).join(', '), 400));
            return;
        }

        const { slotId } = parsed.data;
        const customerId = req.user!.id;

        // Check if customer has already booked this slot
        const existingBooking = await prisma.booking.findFirst({
            where: { customerId, slotId },
        });
        if (existingBooking) {
            next(createError('You have already booked this slot', 409));
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const booking = await prisma.$transaction(async (tx: any) => {
            // Lock the slot row to prevent concurrent booking (SELECT FOR UPDATE)
            const lockedSlots = await tx.$queryRaw<
                Array<{ id: string; status: string }>
            >`SELECT id, status FROM slots WHERE id = ${slotId} FOR UPDATE`;

            if (lockedSlots.length === 0) {
                throw createError('Slot not found', 404);
            }

            const slot = lockedSlots[0];

            if (slot.status !== 'AVAILABLE') {
                throw createError('Slot is not available for booking', 409);
            }

            // Update slot status to BOOKED
            await tx.slot.update({
                where: { id: slotId },
                data: { status: 'BOOKED' },
            });

            // Create the booking with PENDING payment status
            const newBooking = await tx.booking.create({
                data: {
                    customerId,
                    slotId,
                    paymentStatus: 'PENDING',
                },
                include: {
                    slot: {
                        include: {
                            provider: { select: { id: true, name: true, email: true } },
                        },
                    },
                    customer: { select: { id: true, name: true, email: true } },
                },
            });

            return newBooking;
        });

        res.status(201).json({
            success: true,
            message: 'Slot booked successfully. Please confirm payment to finalize.',
            data: { booking },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Confirm payment for a booking.
 *
 * Payment confirmation flow:
 * 1. Validate the booking exists and is in PENDING state.
 * 2. Simulate "payment gateway" call — always succeeds in this simulation.
 * 3. Update paymentStatus to COMPLETED in the DB.
 *
 * Failure handling:
 * If payment succeeds but the DB update fails (simulated via `simulateDbFailure`
 * flag), we log the discrepancy as a "payment reconciliation event". In a real
 * system, this would be picked up by a background reconciliation job that checks
 * the payment gateway's records and retries the DB update. We return a 500 with
 * a clear message instructing the client to contact support with the booking ID.
 */
export const confirmPayment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const parsed = confirmPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            next(createError(parsed.error.issues.map((e) => e.message).join(', '), 400));
            return;
        }

        const { bookingId, simulateDbFailure } = parsed.data;
        const customerId = req.user!.id;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { slot: true },
        });

        if (!booking) {
            next(createError('Booking not found', 404));
            return;
        }

        if (booking.customerId !== customerId && req.user!.role !== 'ADMIN') {
            next(createError('You are not authorized to confirm payment for this booking', 403));
            return;
        }

        if (booking.paymentStatus === 'COMPLETED') {
            next(createError('Payment for this booking has already been confirmed', 400));
            return;
        }

        if (booking.paymentStatus === 'FAILED') {
            next(createError('This booking payment has failed. Please create a new booking.', 400));
            return;
        }

        // ── Simulated payment gateway call ──────────────────────────────────────
        // In a real system: call Stripe/Razorpay here and get a payment intent ID
        const paymentGatewaySuccess = true; // Always succeeds in simulation
        const paymentTransactionId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        // ────────────────────────────────────────────────────────────────────────

        if (!paymentGatewaySuccess) {
            await prisma.booking.update({
                where: { id: bookingId },
                data: { paymentStatus: 'FAILED' },
            });
            await prisma.slot.update({
                where: { id: booking.slotId },
                data: { status: 'AVAILABLE' },
            });
            next(createError('Payment failed. Your slot has been released.', 402));
            return;
        }

        // Simulate DB failure AFTER payment succeeds to demonstrate resilience
        if (simulateDbFailure) {
            // Log the reconciliation event — in production, this goes to a monitoring
            // system (e.g., Sentry, CloudWatch) and a reconciliation queue (e.g., SQS)
            console.error(
                `[RECONCILIATION NEEDED] Payment ${paymentTransactionId} succeeded for ` +
                `booking ${bookingId} but DB update failed. Manual intervention required.`
            );

            res.status(500).json({
                success: false,
                message:
                    'Payment was processed successfully, but we encountered an error finalizing your booking. ' +
                    'Your money is safe. Please contact support with your booking ID.',
                data: { bookingId, paymentTransactionId, action: 'RECONCILIATION_REQUIRED' },
            });
            return;
        }

        // Update booking payment status to COMPLETED
        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: 'COMPLETED' },
            include: {
                slot: {
                    include: {
                        provider: { select: { id: true, name: true, email: true } },
                    },
                },
                customer: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(200).json({
            success: true,
            message: 'Payment confirmed. Booking finalized successfully.',
            data: { booking: updatedBooking, paymentTransactionId },
        });
    } catch (error) {
        next(error);
    }
};

export const getMyBookings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const customerId = req.user!.id;

        const bookings = await prisma.booking.findMany({
            where: { customerId },
            include: {
                slot: {
                    include: {
                        provider: { select: { id: true, name: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            success: true,
            data: { bookings, count: bookings.length },
        });
    } catch (error) {
        next(error);
    }
};

export const getAllBookings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const bookings = await prisma.booking.findMany({
            include: {
                slot: {
                    include: {
                        provider: { select: { id: true, name: true, email: true } },
                    },
                },
                customer: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            success: true,
            data: { bookings, count: bookings.length },
        });
    } catch (error) {
        next(error);
    }
};
