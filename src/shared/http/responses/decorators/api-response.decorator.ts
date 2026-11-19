import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { EntityApiResponse } from '../dto/entity-api-response.dto';
import { PaginatedApiResponse } from '../dto/paginated-api-response.dto';
import { ErrorApiResponse } from '../dto/error-api-response.dto';

/**
 * Options for standard Swagger response decorator.
 */
export interface ApiStandardResponseOptions<TModel extends Type<unknown>> {
  type?: TModel;
  status?: number;
  description?: string;
}

/**
 * Options for paginated Swagger response decorator.
 */
export interface ApiPaginatedResponseOptions<TModel extends Type<unknown>> {
  type: TModel;
  description?: string;
}

/**
 * Options for error Swagger response decorator.
 */
export interface ApiStandardErrorResponseOptions {
  status?: number;
  code?: string;
  description?: string;
}

/**
 * Documents a standard entity, collection, or boolean success response in Swagger/OpenAPI.
 *
 * @template TModel
 * @param {ApiStandardResponseOptions<TModel>} [options] - Response schema options.
 * @returns {MethodDecorator & ClassDecorator}
 */
export function ApiStandardResponse<TModel extends Type<unknown>>(
  options?: ApiStandardResponseOptions<TModel>,
) {
  const status = options?.status ?? 200;
  const description = options?.description ?? 'Successful operation';

  if (!options?.type) {
    return applyDecorators(
      ApiExtraModels(EntityApiResponse),
      ApiResponse({
        status,
        description,
        schema: {
          $ref: getSchemaPath(EntityApiResponse),
        },
      }),
    );
  }

  return applyDecorators(
    ApiExtraModels(EntityApiResponse, options.type),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(EntityApiResponse) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(options.type),
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * Documents a paginated collection success response in Swagger/OpenAPI.
 *
 * @template TModel
 * @param {ApiPaginatedResponseOptions<TModel>} options - Paginated schema options.
 * @returns {MethodDecorator & ClassDecorator}
 */
export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  options: ApiPaginatedResponseOptions<TModel>,
) {
  const description = options.description ?? 'Paginated list retrieval';

  return applyDecorators(
    ApiExtraModels(PaginatedApiResponse, options.type),
    ApiResponse({
      status: 200,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedApiResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(options.type) },
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * Documents an error response in Swagger/OpenAPI.
 *
 * @param {ApiStandardErrorResponseOptions} [options] - Error schema options.
 * @returns {MethodDecorator & ClassDecorator}
 */
export function ApiStandardErrorResponse(
  options?: ApiStandardErrorResponseOptions,
) {
  const status = options?.status ?? 400;
  const description = options?.description ?? 'Bad Request';

  return applyDecorators(
    ApiExtraModels(ErrorApiResponse),
    ApiResponse({
      status,
      description,
      schema: {
        $ref: getSchemaPath(ErrorApiResponse),
      },
    }),
  );
}
