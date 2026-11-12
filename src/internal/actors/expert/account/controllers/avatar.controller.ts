import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { StorageService } from "@/external/storage";
import { PersistExpertAccountAvatarUseCase } from "@/internal/actors/expert/account/use-cases/persist-expert-account-avatar.usecase";
import { CurrentExpert } from "@/internal/actors/expert/auth/decorators/current-expert.decorator";
import { type IExpert } from "@/shared/types/access-token.payload";
import { ExpertJwtAuthGuard } from "@/internal/actors/expert/auth/guards/auth.guard";

const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
    bmp: "image/bmp",
    tiff: "image/tiff",
};

function formatToMime(format?: string, resourceType?: string): string | undefined {
    if (!format) return undefined;
    const ext = String(format).toLowerCase();
    return MIME_MAP[ext] ?? `${resourceType ?? "image"}/${ext}`;
}

@Controller({ path: "expert/account/avatar", version: "1" })
@UseGuards(ExpertJwtAuthGuard)
export class AvatarController {
  constructor(
    private readonly storageService: StorageService,
    private readonly persistAvatarUseCase: PersistExpertAccountAvatarUseCase,
  ) {}

  @Post("upload-signature")
  async avatarUploadSignature(
    @CurrentExpert() expert: IExpert,
    @Body() dto: { folder?: string; resourceType?: string },
  ) {
    console.log(
      "[AvatarController.avatarUploadSignature] expert sub:",
      expert?.sub,
    );
    console.log(
      "[AvatarController.avatarUploadSignature] dto:",
      JSON.stringify(dto),
    );
    const params = await this.storageService.getSignedUploadParams({
      folder: dto?.folder ?? "avatars",
      resourceType: dto?.resourceType ?? "image",
    });
    console.log(
      "[AvatarController.avatarUploadSignature] params:",
      JSON.stringify(params),
    );
    return {
      message: "Signed upload params generated",
      data: {
        ...params,
        maxSizeBytes: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
      },
    };
  }

  @Post("verify")
  async avatarVerify(
    @CurrentExpert() expert: IExpert,
    @Body()
    dto: {
      publicId: string;
      folder?: string;
      resourceType?: string;
      maxSizeBytes?: number;
      allowedMimeTypes?: string[];
    },
  ) {
    console.log("[AvatarController.avatarVerify] expert sub:", expert?.sub);
    console.log("[AvatarController.avatarVerify] dto:", JSON.stringify(dto));

    const resourceType = dto.resourceType ?? "image";

    let verified;
    try {
      verified = await this.storageService.verifyUpload(dto.publicId, {
        folder: dto.folder ?? "avatars",
        resourceType,
        maxSizeBytes: dto.maxSizeBytes ?? 5 * 1024 * 1024,
        allowedMimeTypes: dto.allowedMimeTypes ?? [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ],
      });
    } catch (error) {
      // If validation failed (constraints not met), remove the upload from Cloudinary
      if (error instanceof BadRequestException) {
        await this.storageService.delete(dto.publicId, {
          resourceType,
        });
      }
      throw error;
    }

    console.log(
      "[AvatarController.avatarVerify] verified:",
      JSON.stringify(verified),
    );

    // Persist verified avatar URL to the expert's DB record
    await this.persistAvatarUseCase.execute(expert.sub, verified.secureUrl, verified.publicId, {
      mimeType: formatToMime(verified.format, verified.resourceType),
      bytes: verified.bytes,
      width: verified.width,
      height: verified.height,
      resourceType: verified.resourceType,
    });

    return {
      message: "Avatar verified",
      data: verified,
    };
  }
}
