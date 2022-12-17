import { EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
import { lex } from './lex';
import { findUnit } from './Unit';
import { Diagnostic, linter } from '@codemirror/lint';
import { parse } from './parse';
import { Environment } from './Environment';
import { evaluate } from './evaluate';

const marks = {
    literal: Decoration.mark({ class: 'notaza-literal' }),
    operator: Decoration.mark({ class: 'notaza-operator' }),
    unit: Decoration.mark({ class: 'notaza-unit' }),
    identifier: Decoration.mark({ class: 'notaza-identifier' }),
};

function makeDecorations(input: string): DecorationSet {
    let offset = 0;
    const decorations = [];
    for (const line of input.split('\n')) {
        const tokens = lex(line);
        if (tokens.isOk) {
            for (const token of tokens.value) {
                if (token.type === 'literal') {
                    decorations.push(marks.literal.range(offset + token.from, offset + token.to));
                } else if (token.type === 'operator' || token.type === 'lparen' || token.type === 'rparen') {
                    decorations.push(marks.operator.range(offset + token.from, offset + token.to));
                } else if (token.type === 'identifier') {
                    if (findUnit(token.value).isOk) {
                        decorations.push(marks.unit.range(offset + token.from, offset + token.to));
                    } else {
                        decorations.push(marks.identifier.range(offset + token.from, offset + token.to));
                    }
                }
            }
        }
        offset = offset + line.length + 1;
    }
    return Decoration.set(decorations);
}

const highlighting = ViewPlugin.define(
    (view) => ({
        decorations: makeDecorations(view.state.doc.toString()),
        update(update) {
            this.decorations = makeDecorations(update.state.doc.toString());
        },
    }),
    {
        decorations: (v) => v.decorations,
    },
);

const notazaLinter = linter((view) => {
    let offset = 0;
    let diagnostics: Diagnostic[] = [];
    const environment = new Environment();
    for (const line of view.state.doc.toString().split('\n')) {
        const result = lex(line)
            .chain(parse)
            .chain((ast) => evaluate(environment, ast));
        if (result.isErr) {
            diagnostics.push({
                from: offset,
                to: offset + line.length,
                severity: 'error',
                message: result.error.message,
            });
        }
        offset = offset + line.length + 1;
    }
    return diagnostics;
});

// const resultsField = StateField.define<Array<Result<Value, Error>>>({
//     create(state) {
//         const environment = new Environment();

//         for (const line of state.doc.toString().split('\n')) {
//             environment.addResult(
//                 lex(line)
//                     .chain(parse)
//                     .chain((ast) => evaluate(environment, ast)),
//             );
//         }

//         return environment.getResults();
//     },
//     update(value, transaction) {
//         if (transaction.docChanged) {
//             return this.create(transaction.state);
//         }
//         return value;
//     }
// })

export function makeEditor(onUpdate: (value: string) => unknown): EditorView {
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
                // resultsField,
                highlighting,
                notazaLinter,
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onUpdate(update.state.doc.toString());
                    }
                }),
            ],
        }),
    });
}
