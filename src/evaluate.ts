import { Result } from '@badrap/result';
import { Environment } from './Environment';
import { AST } from './parse';
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
        case 'unary':
            return evaluate(environment, ast.expression).chain((value) =>
                ast.operator === '-' ? value.negated() : Result.ok(value),
            );
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
            return Result.all([findUnit(ast.unitName), evaluate(environment, ast.expression)]).chain(([unit, value]) =>
                value.convertTo(unit),
            );
        case 'function':
            return evaluate(environment, ast.argument).chain((value) => applyFunction(ast.name, value));
        case 'empty':
            return Result.err(new Error(''));
        default:
            assertNever(ast);
    }
}

function operation(name: Extract<AST, { type: 'operator' }>['operator'], lhs: Value, rhs: Value): Result<Value, Error> {
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
    name: Extract<AST, { type: 'aggregation' }>['name'],
): Result<Value, Error> {
    switch (name) {
        case 'sum':
        case 'total':
            return Value.sum(getAggregationValues(environment));
        case 'avg':
        case 'average':
        case 'mean':
            return Value.average(getAggregationValues(environment));
        case 'min':
        case 'minimum':
            return Value.minimum(getAggregationValues(environment));
        case 'max':
        case 'maximum':
            return Value.maximum(getAggregationValues(environment));
        default:
            assertNever(name);
    }
}

function applyFunction(name: Extract<AST, { type: 'function' }>['name'], argument: Value): Result<Value, Error> {
    switch (name) {
        case 'cos':
            return Value.cos(argument);
        case 'sin':
            return Value.sin(argument);
        case 'tan':
            return Value.tan(argument);
        case 'arccos':
            return Value.arccos(argument);
        case 'arcsin':
            return Value.arcsin(argument);
        case 'arctan':
            return Value.arctan(argument);
        case 'ln':
            return Value.ln(argument);
        case 'lg':
            return Value.lg(argument);
        case 'ld':
            return Value.ld(argument);
        case 'abs':
            return Value.abs(argument);
        case 'sqrt':
            return Value.sqrt(argument);
        case 'round':
            return Value.round(argument);
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
