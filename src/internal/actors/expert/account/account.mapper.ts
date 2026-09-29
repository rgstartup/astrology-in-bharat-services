import type {
  ExpertAccountRow,
  ExpertConsultationPricingRow,
} from '../../../../core/drizzledb/schema';

/**
 * Drizzle `numeric` columns come back as strings from the driver — normalize
 * to number at the use-case boundary (TypeORM did the same conversion via
 * `ColumnNumericTransformer`). `simple-array` columns (`gallery`, `videos`,
 * `certificates`) are stored as comma-joined text — split back to arrays
 * (same convention as `cart.mapper.ts`).
 */
export function toExpertAccountResponse<T extends ExpertAccountRow>(
  row: T,
): Omit<T, 'total_earning' | 'gallery' | 'videos' | 'certificates'> & {
  total_earning: number;
  gallery: string[] | null;
  videos: string[] | null;
  certificates: string[] | null;
} {
  return {
    ...row,
    total_earning: Number(row.total_earning),
    gallery:
      row.gallery != null && row.gallery !== '' ? row.gallery.split(',') : null,
    videos:
      row.videos != null && row.videos !== '' ? row.videos.split(',') : null,
    certificates:
      row.certificates != null && row.certificates !== ''
        ? row.certificates.split(',')
        : null,
  };
}

export function toExpertPricingResponse<
  T extends Pick<
    ExpertConsultationPricingRow,
    'chat_price' | 'call_price' | 'video_call_price'
  >,
>(
  row: T,
): Omit<T, 'chat_price' | 'call_price' | 'video_call_price'> & {
  chat_price: number | null;
  call_price: number | null;
  video_call_price: number | null;
} {
  return {
    ...row,
    chat_price: row.chat_price == null ? null : Number(row.chat_price),
    call_price: row.call_price == null ? null : Number(row.call_price),
    video_call_price:
      row.video_call_price == null ? null : Number(row.video_call_price),
  };
}
