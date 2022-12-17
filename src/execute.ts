import { lex } from './lex';
import { parse } from './parse';
import { evaluate } from './evaluate';
import { Environment } from './Environment';

export function execute(input: string): string[] {
    const environment = new Environment();

    for (const line of input.split('\n')) {
        environment.addResult(
            lex(line)
                .chain(parse)
                .chain((ast) => evaluate(environment, ast)),
        );
    }

    return environment.getOutput();
}
