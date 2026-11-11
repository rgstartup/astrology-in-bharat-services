import type { ReviewRow } from '@/core/drizzledb/schema';

export interface ReviewDomain {
  id: number;
  client_id: number;
  order_id: number | null;
  expert_id: number | null;
  merchant_id: number | null;
  session_id: number | null;
  call_session_id: number | null;
  rating: number;
  comment: string | null;
  status: string;
  review_type: string;
  tags: string[];
  created_at: Date;
}

export function toReviewDomain(row: ReviewRow): ReviewDomain {
  return {
    id: row.id,
    client_id: row.client_id,
    order_id: row.order_id,
    expert_id: row.expert_id,
    merchant_id: row.merchant_id,
    session_id: row.session_id,
    call_session_id: row.call_session_id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    review_type: row.review_type,
    tags: row.tags
      ? row.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    created_at: row.created_at,
  };
}