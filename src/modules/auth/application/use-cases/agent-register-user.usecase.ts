import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { Argon2PasswordHasher } from '../../infrastructure/hashing/argon2-password.hasher';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { AuthProfileCreationResolver } from '../strategies/auth-profile-creation.resolver';
import { RegistrationPolicy } from '../../domain/policies/registration.policy';
import * as crypto from 'crypto';
import { NodeMailerService } from '@/external/nodemailer/nodemailer.service';
import { AgentRegisterUserDto } from '../../api/dto';
import { AgentProfile } from '@/modules/agent/infrastructure/persistence/entities/agent-profile.entity';

@Injectable()
export class AgentRegisterUserUseCase {
    private readonly logger = new Logger(AgentRegisterUserUseCase.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly usersFacade: UsersFacade,
        private readonly hasher: Argon2PasswordHasher,
        private readonly profileCreationResolver: AuthProfileCreationResolver,
        private readonly mailer: NodeMailerService,
    ) { }

    async execute(dto: AgentRegisterUserDto, agentId: number) {
        const existingUser = await this.usersFacade.findByEmail(dto.email);

        // Ensure email is unique (throws if not)
        RegistrationPolicy.ensureEmailIsUnique(existingUser);

        // Generate random password (8 chars)
        const generatedPassword = crypto.randomBytes(4).toString('hex');

        let createdUser;

        try {
            await this.db.transaction(async (queryRunner) => {
                const hashedPassword = await this.hasher.hash(generatedPassword);

                // roles is an array in DTO. Format map to match DB expected roles [{name: 'role'}]
                const formattedRoles = dto.roles.map((r) => ({ name: r }));

                createdUser = await this.usersFacade.create(
                    {
                        name: dto.name,
                        email: dto.email,
                        roles: formattedRoles,
                        password: hashedPassword,
                        email_verified_at: new Date(), // verified automatically
                        referred_by_id: agentId,
                    },
                    queryRunner,
                );

                await this.profileCreationResolver.ensureProfile(createdUser, queryRunner);

                // Update agent stats - verify profile exists first
                const agentProfile = await queryRunner.manager.findOne(AgentProfile, {
                    where: { user_id: agentId }
                });

                if (agentProfile) {
                    await queryRunner.manager.increment(
                        AgentProfile,
                        { user_id: agentId },
                        'total_registrations',
                        1
                    );
                } else {
                    this.logger.warn(`Agent profile not found for agent ID: ${agentId}. Skipping registration count increment.`);
                }

                return createdUser;
            });
        } catch (error) {
            this.logger.error(`Failed to register user/expert by agent: ${agentId}`, error.stack);
            throw error;
        }

        const roleString = dto.roles.includes('expert') ? 'Astrologer' : 'User';

        const html = `
      <h1>Welcome to Astrology in Bharat, ${createdUser.name}!</h1>
      <p>An account has been created for you by our team as a ${roleString}.</p>
      <p>Here are your temporary login credentials:</p>
      <ul>
        <li><b>Email:</b> ${createdUser.email}</li>
        <li><b>Temporary Password:</b> ${generatedPassword}</li>
      </ul>
      <p>Please log in and construct a secure password as soon as possible.</p>
    `;

        // Send the email with the credentials
        let emailSent = true;
        let emailError = null;
        try {
            await this.mailer.sendEmail(createdUser.email, 'Your Account Credentials', html);
        } catch (err: any) {
            console.error('Registration email failed:', err.message);
            emailSent = false;
            emailError = err.message;
        }

        return {
            success: true,
            user: createdUser,
            tempPassword: generatedPassword,
            emailSent,
            emailError
        };
    }
}
