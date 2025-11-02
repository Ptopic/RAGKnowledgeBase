import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthPayloadDto } from './dtos/auth.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    signup(payload: AuthPayloadDto): Promise<{
        token: string;
    }>;
    login(payload: AuthPayloadDto): Promise<{
        token: string;
    }>;
}
