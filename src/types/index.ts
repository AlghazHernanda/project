// Memperluas Express Request untuk menyimpan data user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                username: string;
            };
        }
    }
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    full_name?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        token?: string;
        user?: {
            id: number;
            username: string;
            email: string;
            full_name?: string;
        };
    };
}

export interface JwtPayload {
    id: number;
    email: string;
    username: string;
}
