import { EditorState, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
import { lex, Token } from './lex';
import { findUnit } from './Unit';
import { Diagnostic, linter } from '@codemirror/lint';
import { parse } from './parse';
import { Environment } from './Environment';
import { evaluate } from './evaluate';
import { Result } from '@badrap/result';
import { Value } from './Value';

const notazaHighlighter = ViewPlugin.fromClass(
    class {
        private marks = {
            literal: Decoration.mark({ class: 'notaza-literal' }),
            operator: Decoration.mark({ class: 'notaza-operator' }),
            unit: Decoration.mark({ class: 'notaza-unit' }),
            identifier: Decoration.mark({ class: 'notaza-identifier' }),
            comment: Decoration.mark({ class: 'notaza-comment' }),
        };
        public decorations: DecorationSet;
        public constructor(view: EditorView) {
            this.decorations = this.makeDecorations(view.state.field(notazaState).highlightingTokens);
        }
        public update(update: ViewUpdate) {
            this.decorations = this.makeDecorations(update.state.field(notazaState).highlightingTokens);
        }
        private makeDecorations(tokens: Token[]): DecorationSet {
            return Decoration.set(
                tokens.map((token) => {
                    if (token.type === 'literal') {
                        return this.marks.literal.range(token.from, token.to);
                    } else if (
                        token.type === 'operator' ||
                        token.type === 'lparen' ||
                        token.type === 'rparen' ||
                        token.type === 'conversion'
                    ) {
                        return this.marks.operator.range(token.from, token.to);
                    } else if (token.type === 'identifier') {
                        if (findUnit(token.value).isOk) {
                            return this.marks.unit.range(token.from, token.to);
                        } else {
                            return this.marks.identifier.range(token.from, token.to);
                        }
                    }
                    return this.marks.comment.range(token.from, token.to);
                }),
            );
        }
    },
    {
        decorations: (v) => v.decorations,
    },
);

const notazaLinter = linter((view) => view.state.field(notazaState).errors);

type NotazaState = Readonly<{
    input: string;
    output: string[];
    highlightingTokens: Token[];
    errors: Diagnostic[];
    results: Array<Result<Value, Error>>;
}>;

const notazaState = StateField.define<NotazaState>({
    create(state) {
        const input = state.doc.toString();
        const environment = new Environment();
        const highlightingTokens: Token[] = [];
        const errors: Diagnostic[] = [];
        let offset = 0;

        for (const line of input.split('\n')) {
            const tokens = lex(line);
            if (tokens.isOk) {
                highlightingTokens.push(
                    ...tokens.value.map((token) => ({ ...token, from: token.from + offset, to: token.to + offset })),
                );
            }

            const result = tokens.chain(parse).chain((ast) => evaluate(environment, ast));
            environment.addResult(result);
            if (result.isErr && line.trim().length > 0) {
                errors.push({
                    message: result.error.message,
                    from: offset,
                    to: offset + line.length,
                    severity: 'error',
                });
            }

            offset = offset + line.length + 1;
        }

        return {
            input,
            output: environment.getOutput(),
            highlightingTokens,
            errors,
            results: environment.getResults(),
        };
    },
    update(value, transaction) {
        if (transaction.docChanged) {
            return this.create(transaction.state);
        }
        return value;
    },
});

export function makeEditor(onUpdate: (value: NotazaState) => unknown): EditorView {
    return new EditorView({
        parent: document.getElementById('input') as HTMLDivElement,
        state: EditorState.create({
            extensions: [
                history(),
                keymap.of([
                    { key: 'Mod-z', run: undo, preventDefault: true },
                    { key: 'Mod-y', mac: 'Mod-Shift-z', run: redo, preventDefault: true },
                    { key: 'Ctrl-Shift-z', run: redo, preventDefault: true },
                ]),
                notazaState,
                notazaHighlighter,
                notazaLinter,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onUpdate(update.state.field(notazaState));
                    }
                }),
            ],
        }),
    });
}
