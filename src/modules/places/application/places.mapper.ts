import { Injectable } from '@nestjs/common';

@Injectable()
export class PlacesMapper {
  private readonly UNSAFE_DOMAINS = [
    'facebook.com',
    'instagram.com',
    'fbcdn.net',
    'licdn.com',
    'tiktok.com',
  ];

  mapSerperPlaces(
    rawResults: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    if (!rawResults || !Array.isArray(rawResults)) {
      console.log('PlacesMapper: rawResults is not an array', rawResults);
      return [];
    }

    return rawResults.map((item, index) => {
      const thumb =
        (item.thumbnail_url as string) ||
        (item.image_url as string) ||
        (item.thumbnail as string);
      return {
        id: `place_${Date.now()}_${index}`,
        title: (item.title as string) || 'N/A',
        thumbnail_url:
          thumb || 'https://via.placeholder.com/300?text=Sacred+Place',
        address: (item.address as string) || 'Address on request',
        rating: item.rating ? Number(item.rating) : 0,
        rating_count: item.ratingCount ? Number(item.ratingCount) : 0,
        category: (item.category as string) || 'Sacred Site',
      };
    });
  }

  mapSerperImages(
    rawImages: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    if (!rawImages || !Array.isArray(rawImages)) return [];

    return rawImages
      .map((item, index) => ({
        id: `img_${Date.now()}_${index}`,
        title: (item.title as string) || 'Sacred Place View',
        thumbnail_url: this.filterImageUrl(
          (item.imageUrl as string) || (item.image_url as string) || (item.thumbnailUrl as string) || (item.thumbnail_url as string),
        ),
        address: 'N/A',
        rating: 0,
        rating_count: 0,
        category: 'Image View',
      }))
      .filter((item) => item.thumbnail_url !== null);
  }

  private filterImageUrl(url: string): string | null {
    if (!url) return null;

    const isUnsafe = this.UNSAFE_DOMAINS.some((domain) => url.includes(domain));
    if (isUnsafe) return null;

    return url;
  }
}
