import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { createError } from '../middlewares/errorHandler';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { AuthRequest } from '../middlewares/auth';

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            next(createError(parsed.error.issues.map((e) => e.message).join(', '), 400));
            return;
        }

        const { name, email, password, role } = parsed.data;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            next(createError('User with this email already exists', 409));
            return;
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            next(createError(parsed.error.issues.map((e) => e.message).join(', '), 400));
            return;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            next(createError('Invalid email or password', 401));
            return;
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            next(createError('Invalid email or password', 401));
            return;
        }

        const token = generateToken({ id: user.id, email: user.email, role: user.role });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
                token,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        if (!user) {
            next(createError('User not found', 404));
            return;
        }

        res.status(200).json({ success: true, data: { user } });
    } catch (error) {
        next(error);
    }
};
