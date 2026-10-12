/**
 * Attachment-send response — the persisted message payload, identical in
 * shape to the socket `chat:message` event emitted to the room, so the
 * sender can reconcile the HTTP response with the socket echo by id.
 */
export class ExpertChatAttachmentResponseDto {
  id!: number;

  consultationId!: number;

  senderId!: number;

  senderType!: string;

  content!: string;

  messageType!: string;

  attachments!: { url: string; mimeType: string | null }[];

  timestamp!: string;
}
