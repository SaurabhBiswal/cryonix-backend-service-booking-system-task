import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';

export const getAllUsers = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({ success: true, data: { users, count: users.length } });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = req.params.id as string;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            next(createError('User not found', 404));
            return;
        }
        await prisma.user.delete({ where: { id } });
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const getDashboardStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [totalUsers, totalSlots, totalBookings, pendingPayments] = await Promise.all([
            prisma.user.count(),
            prisma.slot.count(),
            prisma.booking.count(),
            prisma.booking.count({ where: { paymentStatus: 'PENDING' } }),
        ]);

        res.status(200).json({
            success: true,
            data: { totalUsers, totalSlots, totalBookings, pendingPayments },
        });
    } catch (error) {
        next(error);
    }
};
