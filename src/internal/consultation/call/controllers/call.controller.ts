import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/internal/auth/guards/auth.guard";
import { CurrentProfile } from "@/shared/decorators/current-profile.decorator";
import { CallType } from "../enum";
import { CallService } from "../call.service";
import { CallSessionFilter } from "../use-cases/get-expert-sessions.use-case";
import { CallGateway } from "../call.gateway";
import { InitiateCallDto } from "../dto/initiate-call.dto";
import { EndCallDto } from "../dto/end-call.dto";
import { GetCallSessionsDto } from "../dto/get-call-sessions.dto";

@Controller({
  path: "call",
  version: "1",
})
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(
    private readonly callService: CallService,
    private readonly callGateway: CallGateway,
  ) {}

  @Post("initiate")
  async initiate(
    @CurrentProfile() clientId: number,
    @Body() dto: InitiateCallDto,
  ) {
    console.log(
      `[CallController] Initiate call: clientId=${clientId}, expert_id=${dto.expert_id}, type=${dto.type || CallType.AUDIO}`,
    );
    return this.callService.initiate(clientId, dto);
  }

  @Post("accept")
  async accept(
    @CurrentProfile() profileId: number,
    @Body() body: { sessionId: number },
  ) {
    console.log(
      `[CallController] Accept call: profileId=${profileId}, sessionId=${body.sessionId}`,
    );
    return this.callService.accept(profileId, body.sessionId);
  }

  @Post("end")
  async end(@Body() dto: EndCallDto) {
    console.log(
      `[CallController] End call: sessionId=${dto.sessionId}, endedBy=${dto.endedBy}`,
    );
    return this.callService.end(dto);
  }

  @Patch("session/:sessionId/status")
  async updateStatus(
    @CurrentProfile() profileId: number,
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body("status") status: string,
  ) {
    console.log(
      `[CallController] Expert Updating status of call session ${sessionId} to ${status}`,
    );

    if (status === "accepted") {
      await this.callService.accept(profileId, sessionId);
      return { success: true };
    }

    if (status === "rejected" || status === "cancelled") {
      const terminator = status === "rejected" ? "EXPERT" : "USER";
      await this.callService.end(
        sessionId,
        terminator,
        "Rejection/Cancellation",
      );
      return { success: true };
    }

    return { success: false, message: "Invalid status update for call" };
  }

  @Get("session/:sessionId")
  @Header("Cache-Control", "no-store")
  async getSession(@Param("sessionId", ParseIntPipe) sessionId: number) {
    return this.callService.getSession(sessionId);
  }

  @Get("token/:sessionId")
  @Header("Cache-Control", "no-store")
  async getToken(
    @CurrentProfile() profileId: number,
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ) {
    return this.callService.getCallToken(profileId, sessionId);
  }

  @Get("sessions/appointments/pending")
  @Header("Cache-Control", "no-store")
  async getPendingAppointments(@CurrentProfile() profileId: number) {
    return this.callService.getExpertSessions(
      profileId,
      CallSessionFilter.RECENT_PENDING,
    );
  }

  @Get("sessions/appointments/completed")
  @Header("Cache-Control", "no-store")
  async getCompletedAppointments(@CurrentProfile() profileId: number) {
    return this.callService.getExpertSessions(
      profileId,
      CallSessionFilter.RECENT_COMPLETED,
    );
  }

  @Get("sessions/all")
  @Header("Cache-Control", "no-store")
  async getAllSessions(
    @CurrentProfile() profileId: number,
    @Query() dto: GetCallSessionsDto,
  ) {
    return this.callService.getExpertSessions(
      profileId,
      CallSessionFilter.ALL,
      dto,
    );
  }
}
