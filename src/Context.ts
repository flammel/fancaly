import { Result } from '@badrap/result';
import BigNumber from 'bignumber.js';
import { value, Value } from './Value';

type Unit = {
    name: string;
    group: 'weight' | 'length' | 'volume';
    multiplier: number;
};

type Operator = {
    name: string;
    operation: (lhs: Value, rhs: Value) => Result<Value, Error>;
};

type Aggregator = {
    name: string;
    operation: (values: Value[]) => Value;
};

const units: Unit[] = [
    { name: 'mm', group: 'length', multiplier: 1 },
    { name: 'cm', group: 'length', multiplier: 10 },
    { name: 'm', group: 'length', multiplier: 1000 },
    { name: 'km', group: 'length', multiplier: 1000000 },
    { name: 'in', group: 'length', multiplier: 25.4 },
    { name: 'ft', group: 'length', multiplier: 304.8 },

    { name: 'g', group: 'weight', multiplier: 1 },
    { name: 'dkg', group: 'weight', multiplier: 10 },
    { name: 'kg', group: 'weight', multiplier: 1000 },
    { name: 't', group: 'weight', multiplier: 1000000 },
    { name: 'oz', group: 'weight', multiplier: 28.3495 },
];

const operators: Operator[] = [
    {
        name: '+',
        operation: (a, b) => withSameUnit(a, b, (a2, b2) => a2.plus(b2)),
    },
    {
        name: '-',
        operation: (a, b) => withSameUnit(a, b, (a2, b2) => a2.minus(b2)),
    },
    {
        name: '*',
        operation: (a, b) => Result.ok(value(a.bignum.times(b.bignum))),
    },
    {
        name: '/',
        operation: (a, b) => Result.ok(value(a.bignum.dividedBy(b.bignum))),
    },
    {
        name: '^',
        operation: (a, b) => Result.ok(value(a.bignum.pow(b.bignum))),
    },
];

const aggregators: Aggregator[] = [
    { name: 'sum', operation: (xs) => value(BigNumber.sum(...xs.map((x) => x.bignum))) },
    { name: 'average', operation: (xs) => value(BigNumber.sum(...xs.map((x) => x.bignum)).dividedBy(xs.length)) },
];

export type Context = {
    operators: Map<string, Operator>;
    aggregators: Map<string, Aggregator>;
    units: Map<string, Unit>;
};

export const defaultContext: Context = {
    operators: mapFromNames(operators),
    aggregators: mapFromNames(aggregators),
    units: mapFromNames(units),
};

function mapFromNames<T extends { name: string }>(xs: T[]): Map<string, T> {
    return new Map(xs.map((x) => [x.name, x]));
}

function withSameUnit(
    lhs: Value,
    rhs: Value,
    operation: (a: BigNumber, b: BigNumber) => BigNumber,
): Result<Value, Error> {
    if (lhs.unit === undefined || rhs.unit === undefined) {
        return Result.ok(value(operation(lhs.bignum, rhs.bignum), lhs.unit ?? rhs.unit));
    }
    const unitMap = mapFromNames(units);
    const lhsUnit = unitMap.get(lhs.unit);
    const rhsUnit = unitMap.get(rhs.unit);
    if (lhsUnit === undefined || rhsUnit === undefined || lhsUnit.group !== rhsUnit.group) {
        return Result.err(new Error('Incompatible units'));
    }

    return Result.ok(
        value(
            operation(lhs.bignum.times(lhsUnit.multiplier), rhs.bignum.times(rhsUnit.multiplier)).dividedBy(
                lhsUnit.multiplier,
            ),
            lhs.unit,
        ),
    );
}
