import { Result } from '@badrap/result';
import { ErrorWithPosition } from './evaluate';
import { Token } from './lex';
import { findUnit } from './Unit';

const aggregationNames = ['sum', 'total', 'average', 'avg', 'mean', 'min', 'max', 'minimum', 'maximum'] as const;
type AggregationName = typeof aggregationNames[number];

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
type FunctionName = typeof functionNames[number];

const binaryOperators = ['+', '-', '*', '/', '^', '**'] as const;
type BinaryOperator = typeof binaryOperators[number];

const prefixOperators = ['+', '-'] as const;
type PrefixOperator = typeof prefixOperators[number];

const conversionOperators = ['->', 'to', 'in'] as const;
type ConversionOperator = typeof conversionOperators[number];

type HighlightTokenType = 'operator' | 'function' | 'variable' | 'literal' | 'unit';
export type HighlightToken = { type: HighlightTokenType; from: number; to: number };

export type Program = { statements: Result<Statement>[]; highlightTokens: HighlightToken[]; };
export type WithPosition<T> = T & { pos: { from: number; to: number } };

export type Statement = WithPosition<
    | { type: 'expression'; expression: Expression }
    | { type: 'assignment'; variableName: string; expression: Expression }
    | { type: 'comment' }
    | { type: 'empty' }
>;

export type Expression =
    | { type: 'operator'; operator: BinaryOperator; lhs: Expression; rhs: Expression }
    | { type: 'unary'; operator: PrefixOperator; expression: Expression }
    | { type: 'literal'; value: string }
    | { type: 'variable'; name: string }
    | { type: 'function'; name: FunctionName; argument: Expression }
    | { type: 'aggregation'; name: AggregationName }
    | { type: 'conversion'; unitName: string; expression: Expression };

export const ast = {
    expression(expression: Expression, from: number, to: number): Statement {
        return { type: 'expression', expression, pos: { from, to } };
    },
    assignment(variableName: string, expression: Expression, from: number, to: number): Statement {
        return { type: 'assignment', variableName, expression, pos: { from, to } };
    },
    comment(from: number, to: number): Statement {
        return { type: 'comment', pos: { from, to } };
    },
    empty(from: number, to: number): Statement {
        return { type: 'empty', pos: { from, to } };
    },
    operator(operator: BinaryOperator, lhs: Expression, rhs: Expression): Expression {
        return {
            type: 'operator',
            operator,
            lhs,
            rhs,
        };
    },
    unary(operator: PrefixOperator, expression: Expression): Expression {
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
    aggregation(name: AggregationName): Expression {
        return { type: 'aggregation', name };
    },
    conversion(unitName: string, expression: Expression): Expression {
        return { type: 'conversion', unitName, expression };
    },
};

// https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html
export function parse(tokens: Token[]): Program {
    const stream = new TokenStream(tokens);
    const statements: Result<Statement>[] = [];

    for (;;) {
        const token = stream.peek();
        if (token === undefined) {
            break;
        }

        if (token.type === 'newline') {
            if (stream.peek(1)?.type === 'newline') {
                statements.push(Result.ok(ast.empty(token.from, token.to)));
                stream.next();
            }
            stream.next();
            continue;
        }

        if (token.type === 'comment') {
            statements.push(Result.ok(ast.comment(token.from, token.to)));
            stream.next();
            continue;
        }

        if (token.type === 'identifier' && stream.peek(1)?.type === 'assignment') {
            stream.next('variable');
            stream.next('operator');
            const expression = parseRecursive(stream, 0);
            if (expression.isOk) {
                statements.push(Result.ok(ast.assignment(token.value, expression.value, token.from, stream.pos())));
            } else {
                stream.nextUntil((token) => token.type === 'newline');
                statements.push(Result.err(new ErrorWithPosition(expression.error.message, token.from, stream.pos())));
            }
            continue;
        }

        const expression = parseRecursive(stream, 0);
        if (expression.isOk) {
            statements.push(Result.ok(ast.expression(expression.value, token.from, stream.pos())));
        } else {
            stream.nextUntil((token) => token.type === 'newline');
            statements.push(Result.err(new ErrorWithPosition(expression.error.message, token.from, stream.pos())));
        }
    }

    return { statements, highlightTokens: stream.highlightTokens };
}

function parseRecursive(tokens: TokenStream, minimumBindingPower: number): Result<Expression> {
    return parseLeft(tokens).chain((lhs) => parseRight(tokens, minimumBindingPower, lhs));
}

function parseLeft(tokens: TokenStream): Result<Expression> {
    const token = tokens.peek();
    if (token === undefined) {
        return makeError('LHS EOF');
    }

    if (token.type === 'newline') {
        return makeError('LHS newline');
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

    const aggregation = parseAggregationName(token);
    if (aggregation.isOk) {
        tokens.next('operator');
        return Result.ok(ast.aggregation(aggregation.value));
    }

    const functionName = parseFunctionName(token);
    if (functionName.isOk) {
        tokens.next('function');
        return parseRecursive(tokens, functionName.value.bindingPower).map((expression) =>
            ast.function(functionName.value.name, expression),
        );
    }

    const prefixOperator = parsePrefixOperator(token);
    if (prefixOperator.isOk) {
        tokens.next('operator');
        return parseRecursive(tokens, prefixOperator.value.bindingPower).map((expression) =>
            ast.unary(prefixOperator.value.operator, expression),
        );
    }

    if (token.type === 'identifier') {
        tokens.next('variable');
        return Result.ok(ast.variable(token.value));
    }

    return makeError('Unhandled left token ' + JSON.stringify(token));
}

function parseRight(tokens: TokenStream, minimumBindingPower: number, lhs: Expression): Result<Expression> {
    for (;;) {
        const peekedToken = tokens.peek();
        if (peekedToken === undefined || peekedToken.type === 'rparen' || peekedToken.type === 'newline') {
            break;
        }

        const binaryOperator = parseBinaryOperator(peekedToken);
        if (binaryOperator.isOk) {
            if (binaryOperator.value.leftBindingPower < minimumBindingPower) {
                break;
            }

            tokens.next('operator');
            const rhs = parseRecursive(tokens, binaryOperator.value.rightBindingPower);
            if (rhs.isOk) {
                lhs = ast.operator(binaryOperator.value.operator, lhs, rhs.value);
            }
            continue;
        }

        const conversionOperator = parseConversionOperator(peekedToken);
        if (conversionOperator.isOk) {
            const unitName = tokens.peek(1);
            if (unitName !== undefined) {
                const unit = parseUnit(unitName);
                if (unit.isOk) {
                    if (conversionOperator.value.bindingPower < minimumBindingPower) {
                        break;
                    }
                    tokens.next('operator');
                    tokens.next('unit');
                    lhs = ast.conversion(unit.value, lhs);
                    continue;
                }
            }
        }

        const unit = parseUnit(peekedToken);
        if (unit.isOk) {
            tokens.next('unit');
            lhs = ast.conversion(unit.value, lhs);
            continue;
        }

        return makeError('Unhandled right token ' + JSON.stringify(peekedToken));
    }

    return Result.ok(lhs);
}

function parseBinaryOperator(
    token: Token,
): Result<{ operator: BinaryOperator; leftBindingPower: number; rightBindingPower: number }> {
    const operator = binaryOperators.find((operator) => operator === token.value);
    if (operator === undefined) {
        return makeError('Unknown binary operator ' + token.value);
    }

    const bindingPowers: Record<BinaryOperator, [number, number]> = {
        '+': [5, 6],
        '-': [5, 6],
        '*': [7, 8],
        '/': [7, 8],
        '^': [10, 9],
        '**': [10, 9],
    };

    return Result.ok({
        operator: operator,
        leftBindingPower: bindingPowers[operator][0],
        rightBindingPower: bindingPowers[operator][1],
    });
}

function parsePrefixOperator(token: Token): Result<{ operator: PrefixOperator; bindingPower: number }> {
    const operator = prefixOperators.find((operator) => operator === token.value);
    if (operator === undefined) {
        return makeError('Unknown prefix operator ' + token.value);
    }

    return Result.ok({ operator, bindingPower: 9 });
}

function parseAggregationName(token: Token): Result<AggregationName> {
    const name = aggregationNames.find((name) => name.toLocaleLowerCase() === token.value.toLocaleLowerCase());
    if (name === undefined) {
        return makeError('Unknown aggregation ' + token.value);
    }

    return Result.ok(name);
}

function parseFunctionName(token: Token): Result<{ name: FunctionName; bindingPower: number }> {
    const name = functionNames.find((name) => name.toLocaleLowerCase() === token.value.toLocaleLowerCase());
    if (name === undefined) {
        return makeError('Unknown function ' + token.value);
    }

    return Result.ok({ name, bindingPower: 11 });
}

function parseConversionOperator(token: Token): Result<{ operator: ConversionOperator; bindingPower: number }> {
    const operator = conversionOperators.find(
        (operator) => operator.toLocaleLowerCase() === token.value.toLocaleLowerCase(),
    );
    if (operator === undefined) {
        return makeError('Unknown conversion ' + token.value);
    }

    return Result.ok({ operator, bindingPower: 4 });
}

function parseUnit(token: Token): Result<string> {
    return findUnit(token.value).map((unit) => unit.name);
}

function makeError<ValueType>(message: string): Result<ValueType> {
    return Result.err(new Error(message));
}

class TokenStream {
    private readonly tokens: Token[];
    private position: number;
    public highlightTokens: HighlightToken[] = [];

    public constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.position = 0;
    }

    public next(useCurrentAs?: HighlightTokenType): Token | undefined {
        if (useCurrentAs !== undefined) {
            this.use(useCurrentAs);
        }
        return this.tokens.at(this.position++);
    }

    public peek(offset = 0): Token | undefined {
        return this.tokens.at(this.position + offset);
    }

    public pos(): number {
        return this.peek()?.from ?? this.tokens.at(this.position - 1)?.to ?? 0;
    }

    public nextUntil(predicate: (token: Token) => boolean): void
    {
        let token = this.peek();
        while (token !== undefined && !predicate(token)) {
            token = this.next();
        }
    }

    private use(type: HighlightTokenType): void {
        const token = this.peek();
        if (token !== undefined) {
            this.highlightTokens.push({
                type,
                from: token.from,
                to: token.to,
            });
        }
    }
}
