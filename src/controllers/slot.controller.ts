import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { createError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { createSlotSchema } from '../validators/slot.validator';

export const createSlot = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const parsed = createSlotSchema.safeParse(req.body);
        if (!parsed.success) {
            next(createError(parsed.error.issues.map((e) => e.message).join(', '), 400));
            return;
        }

        const { startTime, endTime } = parsed.data;
        const providerId = req.user!.id;

        // Check for overlapping slots by the same provider
        const overlapping = await prisma.slot.findFirst({
            where: {
                providerId,
                OR: [
                    {
                        startTime: { lt: new Date(endTime) },
                        endTime: { gt: new Date(startTime) },
                    },
                ],
            },
        });

        if (overlapping) {
            next(createError('You already have a slot that overlaps with this time range', 409));
            return;
        }

        const slot = await prisma.slot.create({
            data: {
                providerId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
            },
            include: {
                provider: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(201).json({
            success: true,
            message: 'Slot created successfully',
            data: { slot },
        });
    } catch (error) {
        next(error);
    }
};

export const getAllSlots = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { status } = req.query;

        const slots = await prisma.slot.findMany({
            where: status ? { status: status as 'AVAILABLE' | 'BOOKED' } : undefined,
            include: {
                provider: { select: { id: true, name: true, email: true } },
                booking: {
                    select: { id: true, paymentStatus: true, customerId: true },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        res.status(200).json({
            success: true,
            data: { slots, count: slots.length },
        });
    } catch (error) {
        next(error);
    }
};

export const getMySlots = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const providerId = req.user!.id;

        const slots = await prisma.slot.findMany({
            where: { providerId },
            include: {
                booking: {
                    select: { id: true, paymentStatus: true, customerId: true },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        res.status(200).json({
            success: true,
            data: { slots, count: slots.length },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSlot = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = req.params.id as string;
        const providerId = req.user!.id;

        const slot = await prisma.slot.findUnique({ where: { id } });
        if (!slot) {
            next(createError('Slot not found', 404));
            return;
        }

        if (slot.providerId !== providerId && req.user!.role !== 'ADMIN') {
            next(createError('You are not authorized to delete this slot', 403));
            return;
        }

        if (slot.status === 'BOOKED') {
            next(createError('Cannot delete a booked slot', 400));
            return;
        }

        await prisma.slot.delete({ where: { id } });

        res.status(200).json({ success: true, message: 'Slot deleted successfully' });
    } catch (error) {
        next(error);
    }
};
