import { SortDto } from "@/shared/sorting/sort.dto";

export const EXPERT_NOTIFICATION_SORT_FIELDS = ["is_read"] as const;

const ExpertNotificationCountSortDto = SortDto(EXPERT_NOTIFICATION_SORT_FIELDS);

export class GetExpertNotificationsCountDto extends ExpertNotificationCountSortDto {}
