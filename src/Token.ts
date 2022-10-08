export type TokenType = 'literal' | 'operator' | 'assignment' | 'lparen' | 'rparen' | 'identifier';

export type Token = { type: TokenType; value: string };

export type Tokens = Token[];
