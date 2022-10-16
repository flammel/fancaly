import { Result } from '@badrap/result';
import { Environment } from './Environment';
import { AST, ASTNode } from './parse';
import { assertNever } from './assertNever';
import { Value } from './Value';
import { findUnit } from './Unit';

export function evaluate(environment: Environment, ast: AST): Result<Value, Error> {
    switch (ast.type) {
        case 'literal':
            return Value.fromString(ast.value);
        case 'operator':
            return Result.all([evaluate(environment, ast.lhs), evaluate(environment, ast.rhs)]).chain(([lhs, rhs]) =>
                operation(ast.operator, lhs, rhs),
            );
        case 'negation':
            return evaluate(environment, ast.expression).chain((value) => value.negated());
        case 'assignment':
            return evaluate(environment, ast.expression).map((value) => {
                environment.setVariable(ast.variableName, value);
                return value;
            });
        case 'aggregation':
            return aggregation(environment, ast.name);
        case 'variable':
            return environment.getVariable(ast.name);
        case 'conversion':
            return Result.all([findUnit(ast.unit), evaluate(environment, ast.expression)]).chain(([unit, value]) =>
                value.convertTo(unit),
            );
        case 'empty':
            return Result.err(new Error(''));
        default:
            assertNever(ast);
    }
}

function operation(
    name: Extract<ASTNode, { type: 'operator' }>['operator'],
    lhs: Value,
    rhs: Value,
): Result<Value, Error> {
    switch (name) {
        case '+':
            return lhs.plus(rhs);
        case '-':
            return lhs.minus(rhs);
        case '*':
            return lhs.times(rhs);
        case '/':
            return lhs.dividedBy(rhs);
        case '^':
            return lhs.pow(rhs);
        case '**':
            return lhs.pow(rhs);
        default:
            assertNever(name);
    }
}

function aggregation(
    environment: Environment,
    name: Extract<ASTNode, { type: 'aggregation' }>['name'],
): Result<Value, Error> {
    switch (name) {
        case 'sum':
        case 'total':
            return Value.sum(getAggregationValues(environment));
        case 'avg':
        case 'average':
        case 'mean':
            return Value.average(getAggregationValues(environment));
        default:
            assertNever(name);
    }
}

function getAggregationValues(environment: Environment): Value[] {
    let values: Value[] = [];
    for (const result of environment.getResults()) {
        if (result.isErr) {
            values = [];
        } else {
            values.push(result.value);
        }
    }
    return values;
}
