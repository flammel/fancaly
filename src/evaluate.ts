import { Result } from '@badrap/result';
import { Context } from './Context';
import { Environment } from './Environment';
import { AST } from './parse';
import { assertNever } from './assertNever';
import { Value } from './Value';

export function evaluate(context: Context, environment: Environment, ast: AST): Result<Value, Error> {
    switch (ast.type) {
        case 'number':
            return ast.unit === undefined
                ? Result.ok(new Value(ast.value.replace(',', '.')))
                : context.getUnit(ast.unit).map((unit) => new Value(ast.value.replace(',', '.'), unit));
        case 'operator':
            return context.getOperator(ast.operator).chain((operator) => {
                const lhs = evaluate(context, environment, ast.lhs);
                if (lhs.isErr) {
                    return lhs;
                }
                const rhs = evaluate(context, environment, ast.rhs);
                if (rhs.isErr) {
                    return rhs;
                }
                return operator.operation(lhs.value, rhs.value);
            });
        case 'negation':
            return evaluate(context, environment, ast.operand).chain((value) => value.negated());
        case 'assignment':
            return evaluate(context, environment, ast.expression).map((value) => {
                environment.setVariable(ast.variableName, value);
                return value;
            });
        case 'variable':
            return context.getAggregator(ast.name).chain(
                (aggregator) => aggregator.operation(environment.getAggregatorValues()),
                () => environment.getVariable(ast.name),
            );
        case 'empty':
            return Result.err(new Error(''));
        default:
            assertNever(ast);
    }
}
