import { Value } from './Value';

export type Environment = {
    variables: Map<string, Value>;
    lines: Array<Value | undefined>;
};

export function emptyEnvironment(): Environment {
    return { variables: new Map(), lines: [] };
}
