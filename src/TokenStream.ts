import { Token } from './lex';
import { HighlightToken } from './parse';

export class TokenStream {
    private readonly tokens: Token[];
    private position: number;
    public highlightTokens: HighlightToken[] = [];

    public constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.position = 0;
    }

    public next(useCurrentAs?: HighlightToken['type']): Token | undefined {
        if (useCurrentAs !== undefined) {
            this.use(useCurrentAs);
        }
        return this.tokens.at(this.position++);
    }

    public peek(offset = 0): Token | undefined {
        return this.tokens.at(this.position + offset);
    }

    private use(type: HighlightToken['type']): void {
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
