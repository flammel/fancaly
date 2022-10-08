export type ASTNode =
    | { type: 'operator'; operator: string; lhs: ASTNode; rhs: ASTNode }
    | { type: 'negation'; operand: ASTNode }
    | { type: 'assignment'; variableName: string; expression: ASTNode }
    | { type: 'number'; value: string; unit?: string }
    | { type: 'variable'; name: string }
    | { type: 'empty' };

export type AST = ASTNode;
