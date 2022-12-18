import { Result } from '@badrap/result';
import { Value } from './Value';

export class Environment {
    public constructor(
        private readonly variables: Map<string, Value> = new Map(),
        private readonly results: Array<Result<Value, Error>> = [],
    ) {}

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

    public getResults(): Array<Result<Value, Error>> {
        return this.results;
    }
}
