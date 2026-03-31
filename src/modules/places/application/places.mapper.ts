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

  mapSerperPlaces(rawResults: any[]): any[] {
    if (!rawResults || !Array.isArray(rawResults)) {
        console.log('PlacesMapper: rawResults is not an array', rawResults);
        return [];
    }

    return rawResults
      .map((item, index) => {
        const thumb = item.thumbnailUrl || item.imageUrl || item.thumbnail;
        return {
          id: `place_${Date.now()}_${index}`,
          title: item.title || 'N/A',
          thumbnailUrl: thumb || 'https://via.placeholder.com/300?text=Sacred+Place',
          address: item.address || 'Address on request',
          rating: item.rating ? Number(item.rating) : 0,
          ratingCount: item.ratingCount ? Number(item.ratingCount) : 0,
          category: item.category || 'Sacred Site',
        };
      });
  }

  mapSerperImages(rawImages: any[]): any[] {
    if (!rawImages || !Array.isArray(rawImages)) return [];

    return rawImages
      .map((item, index) => ({
        id: `img_${Date.now()}_${index}`,
        title: item.title || 'Sacred Place View',
        thumbnailUrl: this.filterImageUrl(item.imageUrl || item.thumbnailUrl),
        address: 'N/A',
        rating: 0,
        ratingCount: 0,
        category: 'Image View',
      }))
      .filter((item) => item.thumbnailUrl !== null);
  }

  private filterImageUrl(url: string): string | null {
    if (!url) return null;

    const isUnsafe = this.UNSAFE_DOMAINS.some((domain) => url.includes(domain));
    if (isUnsafe) return null;

    return url;
  }
}
