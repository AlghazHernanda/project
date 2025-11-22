import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/index';
import { RowDataPacket } from 'mysql2/promise';

interface User extends RowDataPacket {
    id: number;
    username: string;
    email: string;
    password: string;
    full_name?: string;
}

/**
 * REGISTER - Membuat akun baru
 */
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, full_name } = req.body as RegisterRequest;

        // Validasi input
        if (!username || !email || !password) {
            res.status(400).json({
                success: false,
                message: 'Username, email, and password are required',
            });
            return;
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
            return;
        }

        // Validasi panjang password
        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
            return;
        }

        // Dapatkan koneksi dari pool
        const connection = await pool.getConnection();

        try {
            // Cek apakah email atau username sudah terdaftar
            const [existingUser] = await connection.query<User[]>(
                'SELECT id FROM users WHERE email = ? OR username = ?',
                [email, username]
            );

            if (existingUser.length > 0) {
                res.status(409).json({
                    success: false,
                    message: 'Email or username already registered',
                });
                return;
            }

            // Hash password menggunakan bcryptjs
            // Salt rounds = 10 (semakin tinggi, semakin aman tapi lebih lambat)
            const hashedPassword = await bcryptjs.hash(password, 10);

            // Insert user baru ke database
            const [result] = await connection.query(
                'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
                [username, email, hashedPassword, full_name || null]
            );

            // Generate JWT token untuk login otomatis setelah register
            const token = jwt.sign(
                {
                    id: (result as any).insertId,
                    email: email,
                    username: username,
                },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: process.env.JWT_EXPIRY || '7d' }
            );

            const response: AuthResponse = {
                success: true,
                message: 'User registered successfully',
                data: {
                    token,
                    user: {
                        id: (result as any).insertId,
                        username,
                        email,
                        full_name,
                    },
                },
            };

            res.status(201).json(response);
        } finally {
            connection.release(); // Kembalikan koneksi ke pool
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during registration',
        });
    }
};

/**
 * LOGIN - Autentikasi user dan generate token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body as LoginRequest;

        // Validasi input
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
            return;
        }

        // Dapatkan koneksi dari pool
        const connection = await pool.getConnection();

        try {
            // Query user berdasarkan email
            const [users] = await connection.query<User[]>(
                'SELECT id, username, email, password, full_name FROM users WHERE email = ?',
                [email]
            );

            // Jika user tidak ditemukan
            if (users.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid email or password',
                });
                return;
            }

            const user = users[0];

            // Verifikasi password dengan bcryptjs
            // bcryptjs.compare() membandingkan plain password dengan hash yang tersimpan
            const isPasswordValid = await bcryptjs.compare(password, user.password);

            if (!isPasswordValid) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid email or password',
                });
                return;
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: process.env.JWT_EXPIRY || '7d' }
            );

            const response: AuthResponse = {
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        full_name: user.full_name,
                    },
                },
            };

            res.status(200).json(response);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
        });
    }
};

/**
 * GET PROFILE - Ambil profil user (route yang memerlukan autentikasi)
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        // req.user sudah tersisi oleh middleware verifyToken
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }

        const connection = await pool.getConnection();

        try {
            const [users] = await connection.query<User[]>(
                'SELECT id, username, email, full_name, created_at FROM users WHERE id = ?',
                [req.user.id]
            );

            if (users.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }

            const user = users[0];

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        full_name: user.full_name,
                        created_at: user.created_at,
                    },
                },
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving profile',
        });
    }
};
