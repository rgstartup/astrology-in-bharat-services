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
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenCryptoService } from '../../infrastructure/tokens/token-crypto.service';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { ConfigService } from '@nestjs/config';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/persistence/entities/profile-client.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';

@Injectable()
export class AgentRegisterUserUseCase {
    private readonly logger = new Logger(AgentRegisterUserUseCase.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly usersFacade: UsersFacade,
        private readonly hasher: Argon2PasswordHasher,
        private readonly profileCreationResolver: AuthProfileCreationResolver,
        private readonly mailer: NodeMailerService,
        private readonly eventEmitter: EventEmitter2,
        private readonly tokenCrypto: TokenCryptoService,
        private readonly configService: ConfigService,
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

                const isMerchant = dto.roles.includes('merchant');

                createdUser = await this.usersFacade.create(
                    {
                        name: dto.name,
                        email: dto.email,
                        roles: formattedRoles,
                        password: hashedPassword,
                        referred_by_id: Number(agentId),
                    },
                    queryRunner,
                );

                await this.profileCreationResolver.ensureProfile(createdUser, queryRunner);

                // Update phone number in the specific profile if provided
                if (dto.phone) {
                    if (dto.roles.includes('expert')) {
                        await queryRunner.manager.update(ProfileExpert, { user: { id: createdUser.id } }, {
                            phone_number: dto.phone
                        });
                    } else if (dto.roles.includes('merchant')) {
                        await queryRunner.manager.update(ProfileMerchant, { user_id: createdUser.id }, {
                            phone: dto.phone
                        });
                    } else {
                        await queryRunner.manager.update(ProfileClient, { user: { id: createdUser.id } }, {
                            phone: dto.phone
                        });
                    }
                }
                
                // For Merchants, also update shopName if it's set to user's name initially
                if (dto.roles.includes('merchant')) {
                    await queryRunner.manager.update(ProfileMerchant, { user_id: createdUser.id }, {
                        shopName: dto.name
                    });
                }

                // Update agent stats
                const agentProfile = await queryRunner.manager.findOne(AgentProfile, {
                    where: { user_id: agentId }
                });

                if (agentProfile) {
                    const isExpert = dto.roles.includes('expert');
                    const arrayField = isExpert ? 'registered_astrologer_ids' : 'registered_user_ids';

                    // Initialize array if null (though default is '{}')
                    if (!agentProfile[arrayField]) {
                        agentProfile[arrayField] = [];
                    }

                    // Add the new ID to the array
                    agentProfile[arrayField].push(createdUser.id);

                    await queryRunner.manager.save(AgentProfile, agentProfile);

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

        const isExpert = dto.roles.includes('expert');
        const isMerchant = dto.roles.includes('merchant');

        // Generate verification link
        const verification_token = this.tokenCrypto.signTemporaryToken({
            userId: createdUser.id,
            email: createdUser.email,
        });
        
        const configKey = isExpert ? 'email.expertFrontendUrl' : 
                         isMerchant ? 'email.merchantFrontendUrl' : 
                         'email.frontendUrl';
                         
        const frontendUrl = this.configService.get(configKey) || 
                          (isExpert ? process.env.ASTROLOGER_FRONTEND_URL : 
                           isMerchant ? process.env.MERCHANT_FRONTEND_URL : 
                           process.env.FRONTEND_URL);
                           
        const verifyLink = `${frontendUrl}/verify-email?verification_token=${verification_token}`;

        let emailContent = '';
        let emailSubject = '';

        if (isMerchant) {
            emailSubject = 'Merchant Account Created - Action Required';
            emailContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Welcome to Astrology in Bharat, ${createdUser.name}!</h2>
                    <p>An account has been created for you as a <strong>Merchant</strong> for your Puja Shop.</p>
                    
                    <div style="background-color: #fff9c4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #fbc02d; text-align: center;">
                        <h3 style="margin-top: 0; color: #f57f17;">Step 1: Verify Your Email</h3>
                        <p style="margin-bottom: 20px;">Please verify your email address to activate your account:</p>
                        <a href="${verifyLink}" style="display: inline-block; background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Verify My Email</a>
                    </div>

                    <h3 style="color: #333;">Step 2: Login Credentials</h3>
                    <p>After verification, use the following credentials to log in to your merchant dashboard:</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #673ab7;">
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${createdUser.email}</p>
                        <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #eee; padding: 2px 5px; border-radius: 3px;">${generatedPassword}</code></p>
                    </div>
                    <p>You can access your dashboard here: <a href="${frontendUrl}" style="color: #673ab7; font-weight: bold;">Merchant Dashboard</a></p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">If you have any questions, please contact our support team.</p>
                </div>
            `;
        } else {
            const roleString = isExpert ? 'Astrologer' : 'User';
            emailSubject = 'Verification Required & Account Credentials';
            emailContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #333;">Welcome to Astrology in Bharat, ${createdUser.name}!</h2>
                    <p>An account has been created for you by our team as an <strong>${roleString}</strong>.</p>
                    
                    <div style="background-color: #fff9c4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 5px solid #fbc02d; text-align: center;">
                        <h3 style="margin-top: 0; color: #f57f17;">Step 1: Verify Your Email</h3>
                        <p style="margin-bottom: 20px;">Please verify your email address first by clicking the button below:</p>
                        <a href="${verifyLink}" style="display: inline-block; background-color: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Verify My Email</a>
                    </div>

                    <h3 style="color: #333;">Step 2: Login Credentials</h3>
                    <p>Once verified, use the following temporary credentials to log in to your dashboard:</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${createdUser.email}</p>
                        <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #eee; padding: 2px 5px; border-radius: 3px;">${generatedPassword}</code></p>
                    </div>
                    <p style="color: #d32f2f; font-size: 14px;"><strong>Note:</strong> You will be prompted to change your password after your first login.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">If you have any questions, please contact our support team.</p>
                </div>
            `;
        }

        // Send the account email
        let emailSent = true;
        let emailError = null;
        try {
            await this.mailer.sendEmail(createdUser.email, emailSubject, emailContent);
        } catch (err: any) {
            this.logger.error('Registration email failed:', err.message);
            emailSent = false;
            emailError = err.message;
        }

        return {
            success: true,
            user: createdUser,
            emailSent,
            emailError
        };
    }
}
