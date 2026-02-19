import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { CreateAgentDto } from '../dtos/create-agent.dto';
import { Agent, AgentStatus } from '../../domain/entities/agent.entity';
import * as argon2 from 'argon2';
import { CloudinaryService } from '@/common/infrastructure/storage/cloudinary/cloudinary.service';
import { Like, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentCreatedEvent, SendAgentOtpEvent } from '@/modules/notification/application/events/agent.event';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentOtp } from '../../domain/entities/agent-otp.entity';

@Injectable()
export class AgentService {
    constructor(
        @Inject(IAgentRepository)
        private readonly agentRepository: IAgentRepository,
        private readonly cloudinaryService: CloudinaryService,
        private readonly eventEmitter: EventEmitter2,
        @InjectRepository(AgentOtp)
        private readonly otpRepository: Repository<AgentOtp>,
    ) { }

    async createAgent(dto: CreateAgentDto, files?: { aadhaar_doc?: Express.Multer.File[], pan_doc?: Express.Multer.File[], profile_pic?: Express.Multer.File[] }) {
        // Verify if email was verified via OTP
        const otpRecord = await this.otpRepository.findOne({
            where: { email: dto.email, verified: true },
            order: { createdAt: 'DESC' }
        });

        if (!otpRecord) {
            throw new BadRequestException('Email must be verified via OTP first');
        }

        const existing = await this.agentRepository.findByEmail(dto.email);
        if (existing) {
            throw new BadRequestException('Email already exists');
        }

        const agent = new Agent();
        Object.assign(agent, dto);

        // Generate strong random password if not provided or to ensure professional plan
        const rawPassword = dto.password || crypto.randomBytes(6).toString('hex').toUpperCase(); // e.g. 5A2B3C...

        // Hash password
        agent.password = await argon2.hash(rawPassword);

        // Generate agent_id (e.g., AGT-1001)
        // Better sequence: AGT + last 5 digits of timestamp + random
        agent.agent_id = `AGT-${Date.now().toString().slice(-6)}`;
        agent.status = AgentStatus.ACTIVE;

        // Upload documents if present
        if (files) {
            if (files.aadhaar_doc?.[0]) {
                const result = await this.cloudinaryService.uploadImage(files.aadhaar_doc[0]);
                agent.aadhaar_doc_url = result.secure_url;
            }
            if (files.pan_doc?.[0]) {
                const result = await this.cloudinaryService.uploadImage(files.pan_doc[0]);
                agent.pan_doc_url = result.secure_url;
            }
            if (files.profile_pic?.[0]) {
                const result = await this.cloudinaryService.uploadImage(files.profile_pic[0]);
                agent.avatar = result.secure_url;
            }
        }

        const savedAgent = await this.agentRepository.save(agent);

        // Emit email event
        this.eventEmitter.emit('agent:created', new AgentCreatedEvent(
            savedAgent.email,
            savedAgent.name,
            savedAgent.agent_id,
            rawPassword
        ));

        return savedAgent;
    }

    async getAllAgents(search?: string, page: number = 1, limit: number = 10, status?: string) {
        const where: any = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.name = Like(`%${search}%`);
            // You could also add email or agent_id search here via OR
        }

        // Since our IAgentRepository is basic, we might need to extend it for pagination/search
        // or use TypeORM repository directly if shortcut is needed.
        // For DDD, better to add findAndCount to interface.
        // Implementing a simple version for now.

        // Cast to any to access search/pagination if repo supports it or use workaround
        const repo = (this.agentRepository as any).repository;
        const [agents, total] = await repo.findAndCount({
            where,
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });

        return {
            agents,
            total,
            page,
            limit,
        };
    }

    async getAgentStats() {
        const repo = (this.agentRepository as any).repository;
        const total = await repo.count();
        const active = await repo.count({ where: { status: AgentStatus.ACTIVE } });

        // Placeholders for listings/payouts until those modules are ready
        return {
            total,
            active,
            totalListings: 0,
            pendingPayouts: 0,
        };
    }

    async updateAgent(id: string, updateData: any) {
        const agent = await this.agentRepository.findById(id);
        if (!agent) {
            throw new NotFoundException('Agent not found');
        }

        if (updateData.password) {
            updateData.password = await argon2.hash(updateData.password);
        }

        Object.assign(agent, updateData);
        return this.agentRepository.save(agent);
    }

    async getAgentById(id: string) {
        const agent = await this.agentRepository.findById(id);
        if (!agent) {
            throw new NotFoundException('Agent not found');
        }
        return agent;
    }

    async sendOtp(email: string) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const otpRecord = this.otpRepository.create({
            email,
            otp,
            expiresAt,
        });

        await this.otpRepository.save(otpRecord);

        this.eventEmitter.emit('agent:send-otp', new SendAgentOtpEvent(email, otp));

        return { message: 'OTP sent successfully' };
    }

    async verifyOtp(email: string, otp: string) {
        const otpRecord = await this.otpRepository.findOne({
            where: { email, otp },
            order: { createdAt: 'DESC' }
        });

        if (!otpRecord) {
            throw new BadRequestException('Invalid OTP');
        }

        if (otpRecord.expiresAt < new Date()) {
            throw new BadRequestException('OTP expired');
        }

        otpRecord.verified = true;
        await this.otpRepository.save(otpRecord);

        return { message: 'OTP verified successfully' };
    }
}
