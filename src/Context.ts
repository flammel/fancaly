import { Result } from '@badrap/result';
import { Value, Unit } from './Value';

type Operator = {
    name: string;
    operation: (lhs: Value, rhs: Value) => Result<Value, Error>;
};

type Aggregator = {
    name: string;
    operation: (values: Value[]) => Result<Value, Error>;
};

export class Context {
    public constructor(
        private readonly units: Unit[],
        private readonly operators: Operator[],
        private readonly aggregators: Aggregator[],
    ) {}

    public getUnit(name: string): Result<Unit, Error> {
        const unit = this.units.find((a) => a.name === name);
        return unit === undefined ? Result.err(new Error('Unknown unit ' + name)) : Result.ok(unit);
    }

    public getOperator(name: string): Result<Operator, Error> {
        const operator = this.operators.find((a) => a.name === name);
        return operator === undefined ? Result.err(new Error('Unknown operator ' + name)) : Result.ok(operator);
    }

    public getAggregator(name: string): Result<Aggregator, Error> {
        const aggregator = this.aggregators.find((a) => a.name === name);
        return aggregator === undefined ? Result.err(new Error('Unknown aggregator ' + name)) : Result.ok(aggregator);
    }
}

export const defaultContext = new Context(
    [
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
    ],
    [
        { name: '+', operation: (a, b) => a.plus(b) },
        { name: '-', operation: (a, b) => a.minus(b) },
        { name: '*', operation: (a, b) => a.times(b) },
        { name: '/', operation: (a, b) => a.dividedBy(b) },
        { name: '^', operation: (a, b) => a.pow(b) },
    ],
    [
        { name: 'sum', operation: (xs) => Value.sum(xs) },
        { name: 'average', operation: (xs) => Value.average(xs) },
    ],
);
