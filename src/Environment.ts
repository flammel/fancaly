import { Result } from '@badrap/result';
import { Value } from './Value';

export class Environment {
    public constructor(
        private readonly variables: Map<string, Value> = new Map(),
        private readonly results: Array<Result<Value | null, Error>> = [],
    ) {}

    public setVariable(name: string, value: Value): Value {
        this.variables.set(name.toLocaleLowerCase(), value);
        return value;
    }

    public getVariable(name: string): Result<Value, Error> {
        const value = this.variables.get(name.toLocaleLowerCase());
        return value === undefined ? Result.err(new Error('Undefined variable ' + name)) : Result.ok(value);
    }

    public addResult(result: Result<Value, Error>): Result<Value | null, Error> {
        this.results.push(result);
        return result;
    }

    public getResults(): Array<Result<Value | null, Error>> {
        return this.results;
    }

    public getOutput(): string[] {
        return this.results.map((result) => (result.isOk ? (result.value === null ? '' : result.value.toString()) : result.error.message));
    }
}
