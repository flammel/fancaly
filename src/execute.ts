import { Environment } from './Environment';
import { LRLanguage } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';
import { Result } from '@badrap/result';
import { Value } from './Value';
import { findUnit } from './Unit';

export function execute(input: string, language: LRLanguage): string[] {
    const environment = new Environment();

    for (const line of input.split('\n')) {
        environment.addResult(evaluate(line, environment, language.parser.parse(line).topNode));
    }

    return environment.getOutput();
}

function evaluate(input: string, environment: Environment, node: SyntaxNode): Result<Value, Error> {
    switch (node.type.name) {
        case 'Program':
            firstChild(node).chain(
                (c) => evaluate(input, environment, c),
                () => Result.err(new Error('')),
            );
        case 'Line':
            return firstChild(node).chain((fc) => evaluate(input, environment, fc));
        case 'Comment':
            return Result.err(new Error(''));
        case 'Assignment':
            return Result.all([firstChild(node), secondChild(node).chain((c) => evaluate(input, environment, c))]).map(
                ([c1, c2]) => environment.setVariable(input.slice(c1.from, c1.to), c2),
            );
        case 'Name':
            return environment.getVariable(input.slice(node.from, node.to));
        case 'Number':
            return Value.fromString(input.slice(node.from, node.to));
        case 'UnitExpression':
            return Result.all([
                firstChild(node).chain((c) => evaluate(input, environment, c)),
                secondChild(node).chain((c) => findUnit(input.slice(c.from, c.to))),
            ]).chain(([c1, c2]) => c1.convertTo(c2));
        case 'ConversionExpression':
            return Result.all([
                firstChild(node).chain((c) => evaluate(input, environment, c)),
                thirdChild(node).chain((c) => findUnit(input.slice(c.from, c.to))),
            ]).chain(([c1, c2]) => c1.convertTo(c2));
        case 'UnaryExpression':
            return Result.all([
                firstChild(node),
                secondChild(node).chain((c) => evaluate(input, environment, c)),
            ]).chain(([c1, c2]) => unaryOp(input.slice(c1.from, c1.to), c2));
        case 'BinaryExpression':
            return Result.all([
                firstChild(node).chain((c) => evaluate(input, environment, c)),
                secondChild(node),
                thirdChild(node).chain((c) => evaluate(input, environment, c)),
            ]).chain(([c1, c2, c3]) => operation(input.slice(c2.from, c2.to), c1, c3));
        case 'Aggregation':
            return aggregation(environment, input.slice(node.from, node.to));
        default:
            return Result.err(new Error('default eval ' + node.type.name));
    }
}

function operation(name: string, lhs: Value, rhs: Value): Result<Value, Error> {
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
            return Result.err(new Error('unknown binary ' + name));
    }
}

function unaryOp(name: string, value: Value): Result<Value, Error> {
    switch (name) {
        case '+':
            return Result.ok(value);
        case '-':
            return value.negated();
        default:
            return Result.err(new Error('unknown unary ' + name));
    }
}

function aggregation(environment: Environment, name: string): Result<Value, Error> {
    switch (name) {
        case 'sum':
        case 'total':
            return Value.sum(getAggregationValues(environment));
        case 'avg':
        case 'average':
        case 'mean':
            return Value.average(getAggregationValues(environment));
        default:
            return Result.err(new Error('unknown agg ' + name));
    }
}

function getAggregationValues(environment: Environment): Value[] {
    let values: Value[] = [];
    for (const result of environment.getResults()) {
        if (result.isErr || result.value === null) {
            values = [];
        } else {
            values.push(result.value);
        }
    }
    return values;
}

function firstChild(node: SyntaxNode): Result<SyntaxNode, Error> {
    return node.firstChild ? Result.ok(node.firstChild) : Result.err(new Error('no first child in ' + node.type.name));
}

function secondChild(node: SyntaxNode): Result<SyntaxNode, Error> {
    return node.firstChild?.nextSibling
        ? Result.ok(node.firstChild?.nextSibling)
        : Result.err(new Error('no second child'));
}

function thirdChild(node: SyntaxNode): Result<SyntaxNode, Error> {
    return node.firstChild?.nextSibling?.nextSibling
        ? Result.ok(node.firstChild?.nextSibling?.nextSibling)
        : Result.err(new Error('no third child'));
}
