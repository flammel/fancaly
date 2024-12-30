import { EditorState, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, redo, undo } from '@codemirror/commands';
import { linter } from '@codemirror/lint';
import { acceptCompletion, autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { execute, ExecutionResult } from './execute';
import { assertNever } from './assertNever';

const notazaHighlighter = ViewPlugin.fromClass(
    class {
        private marks = {
            literal: Decoration.mark({ class: 'notaza-literal' }),
            operator: Decoration.mark({ class: 'notaza-operator' }),
            unit: Decoration.mark({ class: 'notaza-unit' }),
            variable: Decoration.mark({ class: 'notaza-variable' }),
            function: Decoration.mark({ class: 'notaza-function' }),
            comment: Decoration.mark({ class: 'notaza-comment' }),
        };
        public decorations: DecorationSet;
        public constructor(view: EditorView) {
            this.decorations = this.makeDecorations(view.state.field(notazaState).highlightingTokens);
        }
        public update(update: ViewUpdate) {
            this.decorations = this.makeDecorations(update.state.field(notazaState).highlightingTokens);
        }
        private makeDecorations(tokens: ExecutionResult['highlightingTokens']): DecorationSet {
            return Decoration.set(
                tokens.map((token) => {
                    switch (token.type) {
                        case 'literal':
                            return this.marks.literal.range(token.from, token.to);
                        case 'operator':
                            return this.marks.operator.range(token.from, token.to);
                        case 'unit':
                            return this.marks.unit.range(token.from, token.to);
                        case 'variable':
                            return this.marks.variable.range(token.from, token.to);
                        case 'function':
                            return this.marks.function.range(token.from, token.to);
                        default:
                            assertNever(token.type);
                    }
                }),
            );
        }
    },
    {
        decorations: (v) => v.decorations,
    },
);

const notazaLinter = linter((view) =>
    view.state.field(notazaState).errors.map((error) => ({ ...error, severity: 'error' })),
);

const notazaState = StateField.define<ExecutionResult>({
    create(state) {
        return execute(state.doc.toString());
    },
    update(value, transaction) {
        if (transaction.docChanged) {
            return execute(transaction.state.doc.toString());
        }
        return value;
    },
});

function notazaCompletion(context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(/\w*/);
    if (word?.from === word?.to && !context.explicit) {
        return null;
    }

    return {
        from: word?.from ?? context.pos,
        options: context.state
            .field(notazaState)
            .variableNames.filter((variableName) => variableName.startsWith(word?.text ?? ''))
            .map((variableName) => ({
                label: variableName,
            })),
    };
}

export function makeEditor(parentEl: HTMLDivElement, onUpdate: (value: ExecutionResult) => unknown): EditorView {
    return new EditorView({
        parent: parentEl,
        state: EditorState.create({
            extensions: [
                history(),
                keymap.of([
                    { key: 'Mod-z', run: undo, preventDefault: true },
                    { key: 'Mod-y', mac: 'Mod-Shift-z', run: redo, preventDefault: true },
                    { key: 'Ctrl-Shift-z', run: redo, preventDefault: true },
                    { key: 'Tab', run: acceptCompletion },
                ]),
                keymap.of(defaultKeymap),
                notazaState,
                notazaHighlighter,
                notazaLinter,
                autocompletion({
                    override: [notazaCompletion],
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onUpdate(update.state.field(notazaState));
                    }
                }),
            ],
        }),
    });
}
