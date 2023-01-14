import { lex } from './lex';
import { parse, HighlightToken } from './parse';
import { ErrorWithPosition, evaluate } from './evaluate';

export type ExecutionResult = {
    input: string;
    output: string[];
    highlightingTokens: HighlightToken[];
    errors: { message: string; from: number; to: number }[];
};

export function execute(input: string): ExecutionResult {
    const program = lex(input).map(parse);
    const environment = program.map(evaluate);
    if (program.isOk && environment.isOk) {
        return {
            input,
            output: environment.value
                .getResults()
                .map((value) => (value.isOk && value.value !== null ? value.value.toString() : '')),
            highlightingTokens: program.value.highlightTokens,
            errors: environment.value
                .getResults()
                .map((value) =>
                    value.isErr && value.error instanceof ErrorWithPosition
                        ? {
                              message: value.error.message,
                              from: value.error.from,
                              to: value.error.to,
                          }
                        : undefined,
                )
                .filter(notUndefined),
        };
    }

    return {
        input,
        output: [],
        highlightingTokens: [],
        errors: [],
    };
}

function notUndefined<T>(value: T | undefined): value is T {
    return value !== undefined;
}
