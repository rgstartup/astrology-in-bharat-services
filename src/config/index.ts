import emailConfig from './email.config';
import authConfig from './auth.config';
import databaseConfig from './db.config';
import cloudinaryConfig from './cloudinary.config';
import redisConfig from './redis.config';

export default [
  databaseConfig,
  authConfig,
  emailConfig,
  cloudinaryConfig,
  redisConfig,
];
