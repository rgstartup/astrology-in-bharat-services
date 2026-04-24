import { createConnection } from 'typeorm';
import { User } from './src/modules/users/infrastructure/persistence/entities/user.entity';
import { ProfileExpert } from './src/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { SystemSetting } from './src/modules/admin/infrastructure/persistence/entities/system-setting.entity';

async function checkDb() {
  try {
    const connection = await createConnection({
      type: 'postgres',
      url: 'postgresql://neondb_owner:npg_r94TzaWBnjVv@ep-wispy-sky-a1j6w3i2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
      entities: [User, ProfileExpert, SystemSetting],
      ssl: { rejectUnauthorized: false }
    });

    // 1. Check User Earnings
    const user = await connection.getRepository(User).findOne({
      where: { name: 'cekihad' },
      relations: ['profile_expert'],
    });

    // 2. Check Commission Setting
    const setting = await connection.getRepository(SystemSetting).findOne({
        where: [
            { key: 'COMMISION_FROM_ASTROLOGER' },
            { key: 'COMMISSION_FROM_ASTROLOGER' }
        ]
    });

    console.log('--- DATABASE VERIFICATION ---');
    console.log('Expert Name:', user?.name);
    console.log('Expert Total Earnings:', user?.profile_expert?.total_earning);
    console.log('Commission Setting Key:', setting?.key);
    console.log('Commission Percentage Value:', setting?.value);
    
    if (user?.profile_expert && setting) {
        const earnings = Number(user.profile_expert.total_earning);
        const percent = parseFloat(setting.value);
        console.log('Calculated Commission:', (earnings * percent) / 100);
    }
    
    await connection.close();
  } catch (err) {
    console.error('Error connecting to DB:', err);
  }
}

checkDb();
