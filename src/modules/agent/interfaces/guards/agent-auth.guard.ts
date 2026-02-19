import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AgentJwtAuthGuard extends AuthGuard('agent-jwt') {
    handleRequest(err: any, agent: any, info: any) {
        if (err || !agent) {
            if (info && info.name === 'TokenExpiredError') {
                throw new UnauthorizedException(
                    'Agent session expire ho gaya hai. Please dubara login karein.',
                );
            }
            throw err || new UnauthorizedException('Please login as agent to access this resource.');
        }
        return agent;
    }
}
