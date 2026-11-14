import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { ApiResponse, ResponseMeta } from "@/shared/dto/api-response.dto";
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from "@/shared/dto/paginated-response.dto";
import { BooleanMessage } from "@/shared/dto/boolean-message.dto";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Detect PaginatedResponseDto → extract data + pagination
        if (data instanceof PaginatedResponseDto) {
          return ApiResponse.ok(data.data as T, data.meta);
        }

        // BooleanMessage: { success: boolean, message: string }
        // → data = null, root success = boolean, meta.message = message
        if (data instanceof BooleanMessage) {
          return new ApiResponse<T>({
            success: data.success,
            data: null,
            error: null,
            meta: new ResponseMeta({
              timestamp: new Date().toISOString(),
              message: data.message,
            }),
          });
        }

        // Fallback: plain object with PaginationMetaDto meta
        if (
          data &&
          typeof data === "object" &&
          "meta" in data &&
          data.meta instanceof PaginationMetaDto
        ) {
          const pagination = data.meta as PaginationMetaDto;
          const payload = (data as Record<string, unknown>).data as T;
          return ApiResponse.ok(payload, pagination);
        }

        return ApiResponse.ok(data as T);
      }),
    );
  }
}
