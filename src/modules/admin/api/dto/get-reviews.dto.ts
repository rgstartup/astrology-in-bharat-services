import { PaginationDto } from "@/common/dto/pagination.dto";
import { PickType } from "@nestjs/mapped-types";

export class GetReviewsDTO extends PickType(PaginationDto, ['page', 'limit', 'status', 'search']) {
    ratingType?: string;
    review_type?: string;
}