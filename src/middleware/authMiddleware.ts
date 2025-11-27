import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index';

/**
 * Middleware untuk verifikasi bearer token
 * Digunakan untuk route yang memerlukan autentikasi
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Ambil authorization header
        const authHeader = req.headers.authorization;

        // Cek apakah header ada dan format benar (Bearer <token>)
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'No token provided. Use format: Authorization: Bearer <token>',
            });
            return;
        }

        // Extract token (bagian setelah "Bearer ")
        const token = authHeader.substring(7); // "Bearer " = 7 karakter

        // Verifikasi token menggunakan JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;

        // // Simpan user data di req untuk digunakan di route handler
        // req.user = {
        //     id: decoded.id,
        //     email: decoded.email,
        //     username: decoded.username,
        // };

        next();
    } catch (error) {
        // if (error instanceof jwt.TokenExpiredError) {
        //     res.status(401).json({
        //         success: false,
        //         message: 'Token expired. Please login again.',
        //     });
        // } else if (error instanceof jwt.JsonWebTokenError) {
        //     res.status(401).json({
        //         success: false,
        //         message: 'Invalid token. Please login again.',
        //     });
        // } else {
        //     res.status(500).json({
        //         success: false,
        //         message: 'Error verifying token',
        //     });
        }
    }
};
