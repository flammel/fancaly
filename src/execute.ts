import { lex } from './lex';
import { parse, HighlightToken } from './parse';
import { evaluate } from './evaluate';
import { Environment } from './Environment';

export type ExecutionResult = {
    input: string;
    output: string[];
    highlightingTokens: HighlightToken[];
    errors: { message: string; from: number; to: number }[];
    variableNames: string[];
};

export function execute(input: string): ExecutionResult {
    const environment = new Environment();
    const errors = [];
    const highlightingTokens = [];
    let offset = 0;

    for (const line of input.split('\n')) {
        const parseResult = lex(line).chain(parse);
        if (parseResult.isOk) {
            highlightingTokens.push(
                ...parseResult.value.highlightTokens.map((token) => ({
                    ...token,
                    from: token.from + offset,
                    to: token.to + offset,
                })),
            );
        }

        const lineResult = parseResult.chain((result) => evaluate(environment, result.line));
        environment.addResult(lineResult);
        if (lineResult.isErr) {
            errors.push({
                message: lineResult.error.message,
                from: offset,
                to: offset + line.length,
            });
        }

        offset = offset + line.length + 1;
    }

    return {
        input,
        output: environment
            .getResults()
            .map((result) => (result.isOk && result.value !== null ? result.value.toString() : '')),
        highlightingTokens,
        errors,
        variableNames: environment.getVariableNames(),
    };
}
