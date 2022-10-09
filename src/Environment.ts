import { Result } from '@badrap/result';
import { Value } from './Value';

export class Environment {
    public constructor(
        private readonly variables: Map<string, Value> = new Map(),
        private readonly results: Array<Result<Value, Error>> = [],
    ) {}

    public setVariable(name: string, value: Value): void {
        this.variables.set(name, value);
    }

    public getVariable(name: string): Result<Value, Error> {
        const value = this.variables.get(name);
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