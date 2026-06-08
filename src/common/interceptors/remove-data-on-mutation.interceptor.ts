import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RemoveDataOnMutationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    return next.handle().pipe(
      map(response => {
        // According to the new requirement, PUT, PATCH, and DELETE operations 
        // should NOT return the updated data upon success.
        if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
          if (response && typeof response === 'object' && 'data' in response) {
            const { data, ...rest } = response;
            return rest;
          }
        }
        return response;
      }),
    );
  }
}
