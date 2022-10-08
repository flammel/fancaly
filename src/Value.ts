import BigNumber from 'bignumber.js';

export type Value = {
    bignum: BigNumber;
    unit?: string;
};

export function value(bignum: BigNumber.Value, unit?: string): Value {
    return { bignum: new BigNumber(bignum), unit };
}

export function formatValue(value: Value): string {
    return value.bignum.toString() + (value.unit ? ` ${value.unit}` : '');
}

export function negateValue(toNegate: Value): Value {
    return value(toNegate.bignum.negated(), toNegate.unit);
}
