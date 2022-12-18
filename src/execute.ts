import { lex } from './lex';
import { parse, HighlightToken } from './parse';
import { evaluate } from './evaluate';
import { Environment } from './Environment';

export type ExecutionResult = {
    input: string;
    output: string[];
    highlightingTokens: HighlightToken[];
    errors: { message: string; from: number; to: number }[];
};

export function execute(input: string): ExecutionResult {
    const environment = new Environment();
    const result: ExecutionResult = {
        input,
        output: [],
        highlightingTokens: [],
        errors: [],
    };
    let offset = 0;

    for (const line of input.split('\n')) {
        const parseResult = lex(line).chain(parse);
        if (parseResult.isOk) {
            result.highlightingTokens.push(
                ...parseResult.value.highlightTokens.map((token) => ({
                    ...token,
                    from: token.from + offset,
                    to: token.to + offset,
                })),
            );
        }

        const lineResult = parseResult.chain((result) => evaluate(environment, result.ast));
        environment.addResult(lineResult);
        result.output.push(lineResult.isOk ? lineResult.value.toString() : '');
        if (lineResult.isErr && line.trim().length > 0) {
            result.errors.push({
                message: lineResult.error.message,
                from: offset,
                to: offset + line.length,
            });
        }

        offset = offset + line.length + 1;
    }

    return result;
}
