import { HttpStatus } from '@nestjs/common';
import { DomainError } from '@/common/types/domain.error';

export class CallExpertNotFoundError extends DomainError {
    readonly code = 'CALL_EXPERT_NOT_FOUND';
    readonly message = 'Expert not found';
    readonly httpStatus = HttpStatus.NOT_FOUND;
}

export class CallExpertUnavailableError extends DomainError {
    readonly code = 'CALL_EXPERT_UNAVAILABLE';
    readonly message = 'Expert is currently offline and not accepting call requests at the moment.';
    readonly httpStatus = HttpStatus.BAD_REQUEST;
}

export class CallInsufficientBalanceError extends DomainError {
    readonly code = 'CALL_INSUFFICIENT_BALANCE';
    readonly httpStatus = HttpStatus.BAD_REQUEST;
    readonly message: string;

    constructor(minMinutes: number, minBalanceRequired: number, type: string) {
        super();
        this.message = `Insufficient balance. Minimum ${minMinutes} minutes (₹${minBalanceRequired}) balance is required to start ${type} call.`;
    }
}

export class CallSessionNotFoundError extends DomainError {
    readonly code = 'CALL_SESSION_NOT_FOUND';
    readonly message = 'Call session not found';
    readonly httpStatus = HttpStatus.NOT_FOUND;
}

export class CallSessionAccessDeniedError extends DomainError {
    readonly code = 'CALL_SESSION_ACCESS_DENIED';
    readonly message = 'You are not the expert assigned to this call';
    readonly httpStatus = HttpStatus.BAD_REQUEST;
}

export class CallSessionInvalidStatusError extends DomainError {
    readonly code = 'CALL_SESSION_INVALID_STATUS';
    readonly httpStatus = HttpStatus.BAD_REQUEST;
    readonly message: string;

    constructor(status: string) {
        super();
        this.message = `Call is already ${status}`;
    }
}
