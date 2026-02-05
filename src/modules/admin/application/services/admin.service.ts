import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '@/modules/users';
import { WalletService } from '@/modules/wallet';
import { ProfileService } from '@/modules/expert/application/services/profile.service';
import { ChatService } from '@/modules/chat';

@Injectable()
export class AdminService {
    constructor(
        private readonly usersService: UsersService,
        private readonly walletService: WalletService,
        private readonly profileService: ProfileService,
        private readonly chatService: ChatService,
    ) { }

    async getUserGrowthStats(days: number) {
        return this.usersService.getUserExpertGrowthStats(days);
    }

    async getDashboardStats() {
        const expertStats = await this.usersService.getExpertStats();
        const userStats = await this.usersService.getUserStats();
        const chatSessionsCount = await this.chatService.getTotalSessionsCount();
        const totalEarnings = await this.walletService.getGlobalEarnings();

        return {
            totalChatSessions: chatSessionsCount,
            totalExperts: expertStats.totalExperts,
            totalUsers: userStats.totalUsers,
            totalEarnings: totalEarnings,
            trends: expertStats.trends,
        };
    }

    async getExpertsStats() {
        return this.usersService.getExpertStats();
    }

    async getUserStats() {
        return this.usersService.getUserStats();
    }

    async getAllUsers(search?: string, page: number = 1, limit: number = 10) {
        return this.usersService.findAllByRole('client', search, page, limit);
    }

    async getAllExperts(search?: string, page: number = 1, limit: number = 10) {
        return this.usersService.findAllByRole('expert', search, page, limit);
    }

    async getExpertDetail(id: number) {
        const user = await this.usersService.findById(id);
        if (!user.profile_expert) {
            throw new NotFoundException('Expert profile not found for this user');
        }

        const profile = user.profile_expert;
        const totalEarnings = await this.walletService.getTotalEarnings(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            gender: profile.gender,
            dob: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString() : null,
            phone: profile.phoneNumber || user.profile_client?.phone || '',
            languages: profile.languages ? profile.languages.split(',') : [],
            bio: profile.bio || '',
            experience: profile.experience_in_years,
            specialization: profile.specialization || '',
            rating: profile.rating,
            consultationCount: profile.consultationCount,
            totalEarnings: totalEarnings,
            intro_video_url: profile.video || (profile.videos && profile.videos.length > 0 ? profile.videos[0] : ''),
            gallery: profile.gallery || [],
            documents: profile.documents || [],
            addresses: profile.addresses?.map(addr => ({
                houseNo: addr.houseNo || '',
                district: addr.district || '',
                city: addr.city || '',
                state: addr.state || '',
                country: addr.country || '',
                pincode: addr.pincode || addr.zipCode || ''
            })) || [],
            kyc_details: {
                status: profile.kycStatus,
                reason: profile.rejectionReason,
            },
        };
    }

    async updateExpertStatus(id: number, status: string, reason?: string) {
        return this.profileService.updateKycStatus(id, status, reason);
    }

    async toggleUserBlock(id: number, isBlocked: boolean) {
        return this.usersService.update(id, { isBlocked });
    }
}

