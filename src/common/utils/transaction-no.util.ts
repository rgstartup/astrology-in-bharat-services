import { TransactionPurpose } from "../../modules/wallet/infrastructure/persistence/entities/transaction.entity";



export function generateTransactionNo(role: string, purpose: TransactionPurpose, id: number): string {
    const prefix = 'AIB';
    
    // Role Part
    let rolePart = 'USR';
    const roleLower = role.toLowerCase();
    if (roleLower === 'agent') rolePart = 'AGT';
    else if (roleLower === 'expert') rolePart = 'EXP';

    // Purpose Part
    let purposePart = 'MISC';
    switch (purpose) {
        case TransactionPurpose.WITHDRAWAL:
            purposePart = 'PAY';
            break;
        case TransactionPurpose.RECHARGE:
            purposePart = 'RECH';
            break;
        case TransactionPurpose.PRODUCT_PURCHASE:
            purposePart = 'ORD';
            break;
        case TransactionPurpose.CONSULTATION:
            purposePart = 'CONS';
            break;
        case TransactionPurpose.REFUND:
            purposePart = 'REF';
            break;
        case TransactionPurpose.AGENT_COMMISSION:
            purposePart = 'COMM';
            break;
        case TransactionPurpose.PUJA_CONFIRMATION:
            purposePart = 'PUJA';
            break;
    }

    // Sequence Part (padded to 6 digits)
    const sequencePart = id.toString().padStart(6, '0');

    return `${prefix}-${rolePart}-${purposePart}-${sequencePart}`;
}
