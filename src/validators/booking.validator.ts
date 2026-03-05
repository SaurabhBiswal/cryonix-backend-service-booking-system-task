import { z } from 'zod';

export const createBookingSchema = z.object({
    slotId: z.string().uuid('Invalid slot ID'),
});

export const confirmPaymentSchema = z.object({
    bookingId: z.string().uuid('Invalid booking ID'),
    simulateDbFailure: z.boolean().optional().default(false),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
