import { Result } from '@badrap/result';
import { Value } from './Value';

export class Environment {
    public constructor(
        private readonly variables: Map<string, Value> = new Map(),
        private readonly results: Result<Value | null>[] = [],
    ) {}

    public setVariable(name: string, value: Value): void {
        this.variables.set(name.toLocaleLowerCase(), value);
    }

    public getVariable(name: string): Result<Value> {
        const value = this.variables.get(name.toLocaleLowerCase());
        return value === undefined ? Result.err(new Error('Undefined variable ' + name)) : Result.ok(value);
    }

    public getVariableNames(): string[] {
        return [...this.variables.keys()];
    }

    public addResult(result: Result<Value | null>): void {
        this.results.push(result);
    }

    public getResults(): Result<Value | null>[] {
        return this.results;
    }
}
