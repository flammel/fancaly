import { lex } from './lex';
import { parse } from './parse';
import { evaluate } from './evaluate';
import { defaultContext } from './Context';
import { Environment } from './Environment';

export function execute(input: string): string {
    const lines = input.split('\n');
    const environment = new Environment();

    for (const line of lines) {
        environment.addResult(
            lex(line)
                .chain(parse)
                .chain((ast) => evaluate(defaultContext, environment, ast)),
        );
    }

    return environment.getOutput().join('\n');
}
