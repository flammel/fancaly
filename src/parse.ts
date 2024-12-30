import { Result } from '@badrap/result';
import { Token } from './lex';
import { TokenStream } from './TokenStream';
import { findUnit } from './Unit';

export const aggregationNames = ['sum', 'total', 'average', 'avg', 'mean', 'min', 'max', 'minimum', 'maximum'] as const;
type AggregationName = (typeof aggregationNames)[number];

const functionNames = [
    'cos',
    'sin',
    'tan',
    'arccos',
    'arcsin',
    'arctan',
    'ln',
    'lg',
    'ld',
    'abs',
    'sqrt',
    'round',
] as const;
type FunctionName = (typeof functionNames)[number];

const binaryOperators = ['+', '-', '*', '/', '^', '**', '==', '===', '!=', '!=='] as const;
type BinaryOperator = (typeof binaryOperators)[number];

const prefixOperators = ['+', '-'] as const;
type PrefixOperator = (typeof prefixOperators)[number];

const conversionOperators = ['->', 'to', 'in'] as const;

type HighlightTokenType = 'operator' | 'function' | 'variable' | 'literal' | 'unit';
export interface HighlightToken {
    type: HighlightTokenType;
    from: number;
    to: number;
}

export type Line =
    | { type: 'expression'; expression: Expression }
    | { type: 'assignment'; variableName: string; expression: Expression }
    | { type: 'comment' }
    | { type: 'empty' };

export type Expression =
    | { type: 'operator'; operator: BinaryOperator; lhs: Expression; rhs: Expression }
    | { type: 'unary'; operator: PrefixOperator; expression: Expression }
    | { type: 'literal'; value: string }
    | { type: 'variable'; name: string }
    | { type: 'function'; name: FunctionName; argument: Expression }
    | { type: 'aggregation'; name: AggregationName }
    | { type: 'conversion'; unitName: string; expression: Expression }
    | { type: 'cons'; expression: Expression; next: Expression | null };

export const ast = {
    expression(expression: Expression): Line {
        return { type: 'expression', expression };
    },
    assignment(variableName: string, expression: Expression): Line {
        return { type: 'assignment', variableName, expression };
    },
    comment(): Line {
        return { type: 'comment' };
    },
    empty(): Line {
        return { type: 'empty' };
    },
    operator(
        operator: Extract<Expression, { type: 'operator' }>['operator'],
        lhs: Expression,
        rhs: Expression,
    ): Expression {
        return {
            type: 'operator',
            operator,
            lhs,
            rhs,
        };
    },
    unary(operator: Extract<Expression, { type: 'unary' }>['operator'], expression: Expression): Expression {
        return { type: 'unary', operator, expression };
    },
    literal(value: string): Expression {
        return { type: 'literal', value };
    },
    variable(name: string): Expression {
        return { type: 'variable', name };
    },
    function(name: FunctionName, argument: Expression): Expression {
        return { type: 'function', name, argument };
    },
    aggregation(name: Extract<Expression, { type: 'aggregation' }>['name']): Expression {
        return { type: 'aggregation', name };
    },
    conversion(unitName: string, expression: Expression): Expression {
        return { type: 'conversion', unitName, expression };
    },
    cons(expression: Expression, next: Expression | null): Expression {
        return { type: 'cons', expression, next };
    },
};

// https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html
export function parse(tokens: Token[]): Result<{ line: Line; highlightTokens: HighlightToken[] }> {
    const tokenStream = new TokenStream(tokens);
    const firstToken = tokenStream.peek();

    if (firstToken === undefined) {
        return Result.ok({ line: ast.empty(), highlightTokens: [] });
    }

    if (firstToken.type === 'comment') {
        return Result.ok({ line: ast.comment(), highlightTokens: [] });
    }

    const isAssignment = firstToken.type === 'identifier' && tokenStream.peek(1)?.type === 'assignment';
    const variableName = isAssignment ? firstToken.value : undefined;
    if (aggregationNames.some((aggregationName) => aggregationName === variableName)) {
        return Result.err(new Error('Invalid variable name'));
    }
    if (variableName !== undefined) {
        tokenStream.next('variable');
        tokenStream.next('operator');
    }

    return parseRecursive(tokenStream, 0).map((expression) => ({
        line: variableName ? ast.assignment(variableName, expression) : ast.expression(expression),
        highlightTokens: tokenStream.highlightTokens,
    }));
}

function parseRecursive(tokens: TokenStream, minimumBindingPower: number): Result<Expression> {
    return parseLeft(tokens).chain((lhs) => parseRight(tokens, minimumBindingPower, lhs));
}

function parseLeft(tokens: TokenStream): Result<Expression> {
    const token = tokens.peek();
    if (token === undefined) {
        return Result.err(new Error('LHS EOF'));
    }

    if (token.type === 'literal') {
        tokens.next('literal');
        return Result.ok(ast.literal(token.value));
    }

    if (token.type === 'lparen') {
        tokens.next('operator');
        const result = parseRecursive(tokens, 0);
        tokens.next('operator');
        return result;
    }

    const aggregation = aggregationNames.find((name) => name.toLocaleLowerCase() === token.value.toLocaleLowerCase());
    if (aggregation !== undefined) {
        tokens.next('operator');
        return Result.ok(ast.aggregation(aggregation));
    }

    const functionName = functionNames.find((name) => name.toLocaleLowerCase() === token.value.toLocaleLowerCase());
    if (functionName !== undefined) {
        tokens.next('function');
        return parseRecursive(tokens, bindingPowers.function.right).map((expression) =>
            ast.function(functionName, expression),
        );
    }

    const prefixOperator = prefixOperators.find((operator) => operator === token.value);
    if (prefixOperator !== undefined) {
        tokens.next('operator');
        return parseRecursive(tokens, bindingPowers.prefix.right).map((expression) =>
            ast.unary(prefixOperator, expression),
        );
    }

    if (token.type === 'identifier') {
        tokens.next('variable');
        return Result.ok(ast.variable(token.value));
    }

    return Result.err(new Error('Unhandled left token ' + JSON.stringify(token)));
}

function parseRight(tokens: TokenStream, minimumBindingPower: number, initialLhs: Expression): Result<Expression> {
    let result = Result.ok(initialLhs);
    for (;;) {
        const token = tokens.peek();
        if (token === undefined) {
            break;
        }

        if (token.type === 'rparen') {
            break;
        }

        if (token.type === 'semicolon') {
            if (bindingPowers.semicolon.left < minimumBindingPower) {
                break;
            }

            tokens.next('operator');
            result = Result.all([result, parseRecursive(tokens, bindingPowers.semicolon.right)]).map(([lhs, rhs]) =>
                ast.cons(lhs, rhs),
            );
            continue;
        }

        const binaryOperator = binaryOperators.find((operator) => operator === token.value);
        if (binaryOperator !== undefined) {
            if (bindingPowers[binaryOperator].left < minimumBindingPower) {
                break;
            }

            tokens.next('operator');
            result = Result.all([result, parseRecursive(tokens, bindingPowers[binaryOperator].right)]).map(
                ([lhs, rhs]) => ast.operator(binaryOperator, lhs, rhs),
            );
            continue;
        }

        const conversionOperator = conversionOperators.find(
            (operator) => operator.toLocaleLowerCase() === token.value.toLocaleLowerCase(),
        );
        if (conversionOperator !== undefined) {
            const unitName = tokens.peek(1)?.value;
            const unit = unitName === undefined ? undefined : findUnit(unitName).map((unit) => unit.name);
            if (unit?.isOk) {
                if (bindingPowers.conversion.left < minimumBindingPower) {
                    break;
                }
                tokens.next('operator');
                tokens.next('unit');
                result = result.map((lhs) => ast.conversion(unit.value, lhs));
                continue;
            }
        }

        const unit = findUnit(token.value).map((unit) => unit.name);
        if (unit.isOk) {
            tokens.next('unit');
            result = result.map((lhs) => ast.conversion(unit.value, lhs));
            continue;
        }

        return Result.err(new Error('Unhandled right token ' + JSON.stringify(token)));
    }

    return result;
}

interface BindingPower {
    left: number;
    right: number;
}
function bindingPower(left: number, right: number): BindingPower {
    return { left, right };
}

const bindingPowers: Record<BinaryOperator | 'prefix' | 'function' | 'conversion' | 'semicolon', BindingPower> = {
    prefix: bindingPower(9, 9),
    function: bindingPower(11, 11),
    conversion: bindingPower(4, 4),
    semicolon: bindingPower(2, 1),
    '==': bindingPower(1, 2),
    '===': bindingPower(1, 2),
    '!=': bindingPower(1, 2),
    '!==': bindingPower(1, 2),
    '+': bindingPower(5, 6),
    '-': bindingPower(5, 6),
    '*': bindingPower(7, 8),
    '/': bindingPower(7, 8),
    '^': bindingPower(10, 9),
    '**': bindingPower(10, 9),
};
