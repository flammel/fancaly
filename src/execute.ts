import { lex } from './lex';
import { parse } from './parse';
import { evaluate } from './evaluate';
import { defaultContext } from './Context';
import { emptyEnvironment } from './Environment';
import { formatValue } from './Value';

export function execute(input: string): string {
    const lines = input.split('\n');
    const environment = emptyEnvironment();
    const output: string[] = [];

    for (const line of lines) {
        const result = lex(line)
            .chain(parse)
            .chain((ast) => evaluate(defaultContext, environment, ast));

        if (result.isOk) {
            environment.lines.push(result.value);
            output.push(formatValue(result.value));
        } else {
            environment.lines.push(undefined);
            output.push(result.error.message);
        }
    }

    return output.join('\n');
}
