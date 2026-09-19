import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadApiOptions, UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary.provider';
import { Media } from '@/modules/media/entities/media.entity';
import { MediaSource } from '@/modules/media/enums/media-source.enum';

/**
 * Result returned after a successful image upload or update operation.
 *
 * @interface UploadImageResult
 * @extends {UploadApiResponse}
 * @property {Media} media - The persisted Media entity record from the database.
 */
export type UploadImageResult = UploadApiResponse & {
  media: Media;
};

/**
 * Service responsible for managing Cloudinary image operations (upload, update, delete)
 * and synchronizing corresponding Media entity database records.
 *
 * @class ImageUploadService
 */
@Injectable()
export class ImageUploadService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof v2,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  /**
   * Uploads a new image file to Cloudinary and inserts a corresponding record in the Media database table.
   *
   * @param {Express.Multer.File} file - Multer uploaded file containing buffer and metadata.
   * @param {UploadApiOptions} [options] - Optional Cloudinary upload configuration parameters.
   * @returns {Promise<UploadImageResult>} Cloudinary upload response payload with the saved Media entity.
   * @throws {BadRequestException} When file or buffer is missing.
   * @throws {InternalServerErrorException} When Cloudinary streaming upload fails or does not return a secure URL.
   *
   * @example
   * ```typescript
   * const result = await imageUploadService.uploadImage(file, { folder: 'avatars' });
   * console.log(result.secure_url, result.media.id);
   * ```
   */
  async uploadImage(
    file: Express.Multer.File,
    options?: UploadApiOptions,
  ): Promise<UploadImageResult> {
    this.validateFile(file);

    // Stream the file buffer directly to Cloudinary
    const uploadResult = await this.streamUpload(file, {
      resource_type: 'auto',
      ...options,
    });

    // Save media record in database matching Cloudinary timestamp
    const media = await this.upsertMedia(file, uploadResult);

    return Object.assign(uploadResult, { media });
  }

  /**
   * Updates/overrides an existing image on Cloudinary identified by its public_id.
   * Sets `overwrite: true` and `invalidate: true` to replace the asset on Cloudinary and invalidate the CDN cache,
   * then updates the corresponding database record.
   *
   * @param {Express.Multer.File} file - New image file to replace the existing asset.
   * @param {string} publicId - Cloudinary public_id of the existing asset to override.
   * @param {UploadApiOptions} [options] - Additional Cloudinary upload parameters.
   * @returns {Promise<UploadImageResult>} Cloudinary upload response payload with the updated Media entity.
   * @throws {BadRequestException} When public_id, file, or buffer is missing.
   * @throws {InternalServerErrorException} When Cloudinary upload stream fails or does not return a secure URL.
   *
   * @example
   * ```typescript
   * const result = await imageUploadService.updateImage(newFile, 'user_avatars/xyz123');
   * console.log(result.secure_url, result.media.updated_at);
   * ```
   */
  async updateImage(
    file: Express.Multer.File,
    publicId: string,
    options?: UploadApiOptions,
  ): Promise<UploadImageResult> {
    if (!publicId) {
      throw new BadRequestException('No public_id provided for image update');
    }
    this.validateFile(file);

    // Upload with overwrite and invalidate flags to replace existing Cloudinary asset
    const uploadResult = await this.streamUpload(file, {
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      resource_type: 'auto',
      ...options,
    });

    // Update existing media record in database, or create if not present
    const media = await this.upsertMedia(file, uploadResult, publicId);

    return Object.assign(uploadResult, { media });
  }

  /**
   * Deletes an image from Cloudinary by its public_id and soft-deletes the corresponding Media record in the database.
   *
   * @param {string} publicId - The Cloudinary public_id of the image to destroy.
   * @param {Record<string, any>} [options] - Optional destroy configuration parameters for Cloudinary.
   * @returns {Promise<any>} The deletion response from Cloudinary API.
   * @throws {BadRequestException} When public_id is not provided.
   *
   * @example
   * ```typescript
   * const response = await imageUploadService.deleteImage('user_avatars/xyz123');
   * ```
   */
  async deleteImage(
    publicId: string,
    options?: Record<string, any>,
  ): Promise<any> {
    if (!publicId) {
      throw new BadRequestException('No public_id provided for image deletion');
    }

    // Destroy asset on Cloudinary
    const result = await this.cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      ...options,
    });

    // Soft-delete the matching Media row in the database
    await this.mediaRepository.softDelete({ public_id: publicId });

    return result;
  }

  /**
   * Validates that an uploaded file and its underlying buffer exist.
   *
   * @param {Express.Multer.File} file - Multer file to validate.
   * @throws {BadRequestException} If file or file.buffer is missing.
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file or buffer provided for upload');
    }
  }

  /**
   * Streams a file buffer into Cloudinary's upload stream.
   *
   * @param {Express.Multer.File} file - Multer file containing the buffer.
   * @param {UploadApiOptions} uploadOptions - Options to configure the Cloudinary upload stream.
   * @returns {Promise<UploadApiResponse>} Promise resolving to Cloudinary upload response.
   * @throws {InternalServerErrorException} If upload error occurs or secure_url is missing.
   */
  private async streamUpload(
    file: Express.Multer.File,
    uploadOptions: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                (error as { message?: string })?.message ||
                  'Unknown Cloudinary Error',
              ),
            );
          }
          if (!result || !result.secure_url) {
            return reject(
              new InternalServerErrorException(
                'Cloudinary upload failed: no secure_url returned',
              ),
            );
          }
          resolve(result);
        },
      );

      // Pipe the file buffer stream into the Cloudinary upload stream
      const readStream = streamifier.createReadStream(file.buffer);
      readStream.on('error', (err) => reject(err));
      uploadStream.on('error', (err) => reject(err));
      readStream.pipe(uploadStream);
    });
  }

  /**
   * Synchronizes Cloudinary upload results with the database Media table.
   * Preserves exact timestamps returned by Cloudinary.
   *
   * @param {Express.Multer.File} file - Uploaded Multer file containing original metadata.
   * @param {UploadApiResponse} uploadResult - Response object returned by Cloudinary.
   * @param {string} [existingPublicId] - Public ID used to find an existing record to update.
   * @returns {Promise<Media>} The saved or updated Media entity record.
   */
  private async upsertMedia(
    file: Express.Multer.File,
    uploadResult: UploadApiResponse,
    existingPublicId?: string,
  ): Promise<Media> {
    // Parse Cloudinary's created_at timestamp
    const timestamp = uploadResult.created_at
      ? new Date(uploadResult.created_at)
      : new Date();

    const lookupPublicId = existingPublicId || uploadResult.public_id;

    // Check if a media record already exists for this Cloudinary public_id
    let media = lookupPublicId
      ? await this.mediaRepository.findOne({
          where: { public_id: lookupPublicId, source: MediaSource.CLOUDINARY },
        })
      : null;

    const mimeType =
      file.mimetype ||
      (uploadResult.format ? `image/${uploadResult.format}` : null);
    const fileName =
      file.originalname || uploadResult.original_filename || null;
    const fileSize = uploadResult.bytes || file.size || null;

    if (media) {
      // Update existing record
      media.url = uploadResult.secure_url;
      media.public_id = uploadResult.public_id;
      if (mimeType) media.mime_type = mimeType;
      if (fileSize) media.file_size = fileSize;
      if (fileName) media.file_name = fileName;
      media.updated_at = timestamp;
      return this.mediaRepository.save(media);
    }

    // Create new record
    media = this.mediaRepository.create({
      url: uploadResult.secure_url,
      source: MediaSource.CLOUDINARY,
      public_id: uploadResult.public_id,
      mime_type: mimeType,
      file_size: fileSize,
      file_name: fileName,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return this.mediaRepository.save(media);
  }
}


