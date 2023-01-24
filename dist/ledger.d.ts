type LedgerOptions = {
    debug: boolean;
    path: {
        partSize: number;
    };
    entity: {
        base: string;
    };
};
declare function ledger(this: any, options: LedgerOptions): void;
export default ledger;
