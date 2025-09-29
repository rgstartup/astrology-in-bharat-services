import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DATABASE_CONNECTION, DbType } from 'src/lib/drizzle';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) db: DbType) {}
}
