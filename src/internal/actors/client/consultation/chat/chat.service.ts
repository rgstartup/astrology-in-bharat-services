import { Injectable } from "@nestjs/common";
import { CheckChatEligibilityUsecase } from "./use-cases/check-chat-eligibility.usecase";
import { GetChatHistoryUseCase } from "./use-cases/get-chat-history.usecase";
import { UploadChatAttachmentUseCase } from "./use-cases/upload-chat-attachment.usecase";
import { ChatEligibilityResponseDto } from "./dto/chat-eligibility-response.dto";
import { ChatHistoryResponseDto } from "./dto/chat-history-response.dto";
import { ChatAttachmentResponseDto } from "./dto/chat-attachment-response.dto";

/**
 * Chat entry point for client consultations.
 *
 * Responsibilities:
 * - Delegate chat eligibility, history, and attachment flows
 *   to their single-responsibility use-cases.
 * - Initiation is owned by `ClientConsultationService` via
 *   `InitiateConsultationUsecase` (mode-agnostic).
 */
@Injectable()
export class ClientChatService {
  constructor(
    private readonly checkChatEligibilityUsecase: CheckChatEligibilityUsecase,
    private readonly getChatHistoryUsecase: GetChatHistoryUseCase,
    private readonly uploadChatAttachmentUsecase: UploadChatAttachmentUseCase,
  ) {}

  /**
   * Checks whether a client can start a chat with an expert.
   *
   * @param clientId - ID of the requesting client.
   * @param expertId - ID of the expert to consult.
   * @returns Eligibility payload (eligible flag, rate, balance).
   */
  checkEligibility(
    clientId: number,
    expertId: number,
  ): Promise<ChatEligibilityResponseDto> {
    return this.checkChatEligibilityUsecase.execute(clientId, expertId);
  }

  /**
   * Returns the message history of a consultation.
   *
   * @param clientId - ID of the requesting client.
   * @param consultationId - ID of the consultation.
   * @returns Consultation-scoped message history.
   */
  getChatHistory(
    clientId: number,
    consultationId: number,
  ): Promise<ChatHistoryResponseDto> {
    return this.getChatHistoryUsecase.execute(clientId, consultationId);
  }

  /**
   * Sends a chat attachment (file upload with optional text).
   *
   * @param clientId - ID of the requesting client.
   * @param consultationId - ID of the consultation.
   * @param file - Uploaded file (optional when content carries the message).
   * @param content - Optional text accompanying the attachment.
   * @param idempotencyKey - Optional key deduplicating retries.
   * @returns Persisted attachment message payload.
   */
  uploadAttachment(
    clientId: number,
    consultationId: number,
    file: Express.Multer.File | undefined,
    content?: string,
    idempotencyKey?: string,
  ): Promise<ChatAttachmentResponseDto> {
    return this.uploadChatAttachmentUsecase.execute(
      clientId,
      consultationId,
      file,
      content,
      idempotencyKey,
    );
  }
}
