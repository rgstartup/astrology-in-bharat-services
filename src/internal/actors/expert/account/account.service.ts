import { Injectable } from '@nestjs/common';
import { IExpert } from '@/shared/types/access-token.payload';
import { UpdateExpertAccountDto } from './dto/request/account.dto';
import { GetExpertAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateExpertAccountAvatarUseCase } from './use-cases/update-account-avatar.usecase';
import { UpdateExpertAccountIntroVideoUseCase } from './use-cases/update-account-intro-video.usecase';
import { UpdateExpertAccountUseCase } from './use-cases/update-account.usecase';
import { UpdateExpertAccountStatusUseCase } from './use-cases/update-account-status.usecase';
import { ExpertKycStatus } from '@/internal/actors/expert/shared/enums/kyc-status.enum';
import { ExpertAccountPujasUseCase } from './use-cases/account-pujas.usecase';
import { ExpertPujaDto } from '@/internal/actors/expert/profile/dto/expert-puja.dto';

@Injectable()
export class ExpertAccountService {
  constructor(
    private readonly getAccountUseCase: GetExpertAccountUseCase,
    private readonly updateAccountUseCase: UpdateExpertAccountUseCase,
    private readonly updateAvatarUseCase: UpdateExpertAccountAvatarUseCase,
    private readonly updateIntroVideoUseCase: UpdateExpertAccountIntroVideoUseCase,
    // private readonly createAccountUseCase: CreateExpertAccountUseCase,
    private readonly updateStatusUseCase: UpdateExpertAccountStatusUseCase,
    private readonly pujasUseCase: ExpertAccountPujasUseCase,
  ) {}

  getAccount(expert: IExpert) {
    return this.getAccountUseCase.execute(expert);
  }

  updateAccount(expert: IExpert, dto: UpdateExpertAccountDto) {
    return this.updateAccountUseCase.execute(expert, dto);
  }

  updateAvatar(expert: IExpert, file: Express.Multer.File, public_id?: string) {
    return this.updateAvatarUseCase.execute(
      Number(expert.sub),
      file,
      public_id,
    );
  }

  updateIntroVideo(
    expert: IExpert,
    file: Express.Multer.File,
    public_id?: string,
  ) {
    return this.updateIntroVideoUseCase.execute(
      Number(expert.sub),
      file,
      public_id,
    );
  }

  // createAccount(expert: IExpert, dto: CreateExpertAccountDto) {
  //   return this.createAccountUseCase.execute(expert, dto);
  // }

  updateStatus(expert: IExpert, isAvailable: boolean) {
    return this.updateStatusUseCase.execute(expert, isAvailable);
  }

  updateKycStatus(id: number, status: ExpertKycStatus, reason?: string) {
    return this.updateStatusUseCase.updateKyc(id, status, reason);
  }

  upsertPuja(expert: IExpert, dto: ExpertPujaDto, id?: number) {
    return this.pujasUseCase.upsert(expert, dto, id);
  }

  deletePuja(expert: IExpert, id: number) {
    return this.pujasUseCase.remove(expert, id);
  }

  listAllPujas() {
    return this.pujasUseCase.list();
  }

  getPujaById(id: number) {
    return this.pujasUseCase.byId(id);
  }

  updatePujaLikes(id: number, diff: number) {
    return this.pujasUseCase.updateLikes(id, diff);
  }
}
