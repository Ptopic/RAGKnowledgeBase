import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthPayloadDto } from './dtos/auth.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    signup(payload: AuthPayloadDto): Promise<{
        token: string;
    }>;
    login(payload: AuthPayloadDto): Promise<{
        token: string;
    }>;
    me(req: Request): any;
}
