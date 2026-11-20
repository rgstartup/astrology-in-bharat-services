import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { expertAccounts } from "@/core/drizzledb/schema";
import { IExpert } from "@/shared/types/access-token.payload";
import { toExpertAccountResponse } from "../account.mapper";
import { PresenceService } from "@/internal/actors/expert/presence/presence.service";
import { AvailabilityMode } from "@/core/enums";

@Injectable()
export class UpdateExpertAccountStatusUseCase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presenceService: PresenceService,
  ) {}

  async execute(expert: IExpert, isAvailable: boolean | AvailabilityMode) {
    const mode: AvailabilityMode =
      typeof isAvailable === "string"
        ? isAvailable
        : isAvailable
          ? AvailabilityMode.AVAILABLE
          : AvailabilityMode.UNAVAILABLE;

    const [account] = await this.db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.id, Number(expert.sub)))
      .limit(1);
    if (!account) throw new NotFoundException("Expert account not found");

    await this.presenceService.setAvailability(account.id, mode);

    const [updated] = await this.db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.id, account.id))
      .limit(1);

    return toExpertAccountResponse(updated || account);
  }
}
