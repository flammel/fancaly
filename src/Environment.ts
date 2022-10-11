import { Result } from '@badrap/result';
import { Value, Unit } from './Value';

export class Environment {
    private readonly units: Unit[] = [
        { name: 'mm', group: 'length', multiplier: 1, exponent: 1 },
        { name: 'cm', group: 'length', multiplier: 10, exponent: 1 },
        { name: 'm', group: 'length', multiplier: 1000, exponent: 1 },
        { name: 'km', group: 'length', multiplier: 1000000, exponent: 1 },
        { name: 'in', group: 'length', multiplier: 25.4, exponent: 1 },
        { name: 'ft', group: 'length', multiplier: 304.8, exponent: 1 },

        { name: 'g', group: 'weight', multiplier: 1 },
        { name: 'dkg', group: 'weight', multiplier: 10 },
        { name: 'kg', group: 'weight', multiplier: 1000 },
        { name: 't', group: 'weight', multiplier: 1000000 },
        { name: 'oz', group: 'weight', multiplier: 28.3495 },

        { name: '%', group: 'percent', multiplier: 1 },

        { name: 'EUR', group: 'currency', multiplier: 1, synonyms: ['€'] },
        { name: 'USD', group: 'currency', multiplier: 1, synonyms: ['$'] },
    ];

    public constructor(
        private readonly variables: Map<string, Value> = new Map(),
        private readonly results: Array<Result<Value, Error>> = [],
    ) {}

    public getUnit(name: string): Result<Unit, Error> {
        const unit = this.units.find((a) => a.name.toLowerCase() === name.toLowerCase() || a.synonyms?.includes(name));
        return unit === undefined ? Result.err(new Error('Unknown unit ' + name)) : Result.ok(unit);
    }

    public setVariable(name: string, value: Value): void {
        this.variables.set(name.toLocaleLowerCase(), value);
    }

    public getVariable(name: string): Result<Value, Error> {
        const value = this.variables.get(name.toLocaleLowerCase());
        return value === undefined ? Result.err(new Error('Undefined variable ' + name)) : Result.ok(value);
    }

    public addResult(result: Result<Value, Error>): void {
        this.results.push(result);
    }

    public getOutput(): string[] {
        return this.results.map((result) => (result.isOk ? result.value.toString() : result.error.message));
    }

    public getAggregatorValues(): Value[] {
        let values: Value[] = [];
        for (const result of this.results) {
            if (result.isErr) {
                values = [];
            } else {
                values.push(result.value);
            }
        }
        return values;
    }
}
