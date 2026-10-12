import { ChatAttachmentMessageError } from '@/internal/realtime/chat/chat-attachment-message.error';

/** Client alias — the attachment-send flow is shared across actors. */
export class ChatAttachmentUploadError extends ChatAttachmentMessageError {}
