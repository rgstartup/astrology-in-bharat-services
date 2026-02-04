import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';

export enum SpendingPeriod {
    LAST_MONTH = 'last_month',
    LAST_3_MONTHS = 'last_3_months',
    LAST_6_MONTHS = 'last_6_months',
    ALL_TIME = 'all_time',
}

export enum UserType {
    ALL = 'all',
    PREMIUM = 'premium',
    REGULAR = 'regular',
}

export class UserFilterDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    minSpending?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    maxSpending?: number;

    @IsEnum(SpendingPeriod)
    @IsOptional()
    spendingPeriod?: SpendingPeriod;

    @IsNumber()
    @IsOptional()
    @Min(0)
    minSessions?: number;

    @IsString()
    @IsOptional()
    registeredAfter?: string;

    @IsString()
    @IsOptional()
    registeredBefore?: string;

    @IsEnum(UserType)
    @IsOptional()
    userType?: UserType;

    @IsBoolean()
    @IsOptional()
    isBlocked?: boolean;
}

export class UserFilterListDto extends UserFilterDto {
    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number = 1;

    @IsNumber()
    @IsOptional()
    @Min(1)
    limit?: number = 10;
}

export class BulkAssignCouponDto {
    @IsString()
    @IsNotEmpty()
    couponCode: string;

    @IsOptional()
    filters?: UserFilterDto;
}
