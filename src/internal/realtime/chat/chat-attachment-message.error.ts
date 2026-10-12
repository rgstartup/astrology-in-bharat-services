import { DomainError } from '@/shared/errors';

/**
 * Attachment-send failure. Same wire contract (`code` + 400) as the
 * retired upload-only flow so composer error handling is unchanged.
 */
export class ChatAttachmentMessageError extends DomainError {
  readonly code = 'CHAT_ATTACHMENT_UPLOAD_FAILED';

  readonly message: string;

  constructor(reason = 'File upload failed. Please try again.') {
    super();
    this.message = reason;
  }
}
