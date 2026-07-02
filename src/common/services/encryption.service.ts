import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length !== 64) {
      this.logger.error(
        'CRITICAL: ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
      // We don't throw here to prevent the whole app from crashing if the key is missing during dev
      // but we log it as critical.
    }
    this.key = encryptionKey
      ? Buffer.from(encryptionKey, 'hex')
      : Buffer.alloc(32);
  }

  encrypt(text: string | null | undefined): string | undefined {
    if (!text || typeof text !== 'string') return undefined;

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error(
        `Encryption failed for text: ${text.substring(0, 3)}...`,
        (error as Error).stack,
      );
      return text; // Return plain text as fallback to avoid breaking usage
    }
  }

  decrypt(encryptedText: string | null | undefined): string | undefined {
    if (!encryptedText || typeof encryptedText !== 'string') return undefined;

    // Basic format check: iv:encryptedData
    if (!encryptedText.includes(':')) return encryptedText;

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) return encryptedText;

      const [ivHex, encrypted] = parts;
      if (ivHex.length !== 32) return encryptedText; // IV must be 16 bytes (32 hex chars)

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (_error) {
      // If it looks like encrypted data but fail to decrypt, it might be a different key
      // or malformed. We log and return original string to be safe.
      this.logger.warn(
        `Decryption failed for format-matching string. Possible key mismatch.`,
      );
      return encryptedText;
    }
  }
}
