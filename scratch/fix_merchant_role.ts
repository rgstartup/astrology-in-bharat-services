import { DataSource } from 'typeorm';
import { Role } from '../src/modules/role/entities/roles.entity';
import { User } from '../src/modules/users/infrastructure/persistence/entities/user.entity';
import { ProfileMerchant } from '../src/modules/merchant/profile/infrastructure/persistence/entities/profile-merchant.entity';

async function fixUser() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'astrology_in_bharat',
        entities: [Role, User, ProfileMerchant],
        synchronize: false
    });

    try {
        await ds.initialize();
        console.log('Database initialized');

        const email = 'secetel851@azucore.com';
        const user = await ds.getRepository(User).findOne({ 
            where: { email },
            relations: ['roles']
        });

        if (!user) {
            console.log(`User with email ${email} not found`);
            return;
        }

        console.log(`Found user ID: ${user.id}, current roles:`, user.roles.map(r => r.name));

        const merchantRole = await ds.getRepository(Role).findOne({ where: { name: 'merchant' } });
        if (!merchantRole) {
            console.log('Merchant role not found in database');
            return;
        }

        const hasMerchantRole = user.roles.some(r => r.id === merchantRole.id);
        if (!hasMerchantRole) {
            user.roles.push(merchantRole);
            await ds.getRepository(User).save(user);
            console.log('Successfully added merchant role to user');
        } else {
            console.log('User already has merchant role');
        }

        // Also ensure merchant profile exists
        let profile = await ds.getRepository(ProfileMerchant).findOne({ where: { user_id: user.id } });
        if (!profile) {
            console.log('Creating missing merchant profile...');
            profile = ds.getRepository(ProfileMerchant).create({
                user_id: user.id,
                shopName: 'Azucore Shop',
                status: 'active' as any
            });
            await ds.getRepository(ProfileMerchant).save(profile);
            console.log('Merchant profile created');
        } else {
            console.log('Merchant profile already exists, status:', profile.status);
            if (profile.status !== 'active') {
                profile.status = 'active' as any;
                await ds.getRepository(ProfileMerchant).save(profile);
                console.log('Merchant profile status updated to active');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await ds.destroy();
    }
}

fixUser();
