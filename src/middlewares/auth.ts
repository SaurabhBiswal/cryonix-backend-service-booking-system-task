import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('Authorization token required', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(createError('Invalid or expired token', 401));
        } else {
            next(error);
        }
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(createError('Unauthorized', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(createError(`Access denied. Required roles: ${roles.join(', ')}`, 403));
            return;
        }
        next();
    };
};
