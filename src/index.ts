import { EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
import { Base64 } from 'js-base64';
import { execute } from './execute';
import { helpInput } from './help';
import { lex } from './lex';
import { findUnit } from './Unit';

const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;
const separatorEl = document.getElementById('separator') as HTMLDivElement;

//
// Editor
//

const marks = {
    literal: Decoration.mark({ class: 'notaza-literal' }),
    operator: Decoration.mark({ class: 'notaza-operator' }),
    unit: Decoration.mark({ class: 'notaza-unit' }),
    identifier: Decoration.mark({ class: 'notaza-identifier' }),
};
function makeDecorations(input: string): DecorationSet {
    const lines = input.split('\n');
    let offset = 0;
    const decorations = [];
    for (const line of lines) {
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

const editor = new EditorView({
    parent: document.getElementById('input') as HTMLDivElement,
    state: EditorState.create({
        extensions: [
            history(),
            keymap.of([
                { key: 'Mod-z', run: undo, preventDefault: true },
                { key: 'Mod-y', mac: 'Mod-Shift-z', run: redo, preventDefault: true },
                { key: 'Ctrl-Shift-z', run: redo, preventDefault: true },
            ]),
            highlighting,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const input = update.state.doc.toString();
                    window.location.hash = Base64.encode(input);
                    outputEl.innerHTML = execute(input)
                        .map((line) => `<span>${line === '' ? '&nbsp;' : line}</span>`)
                        .join('');
                }
            }),
        ],
    }),
});

const hash = window.location.hash.substring(1);
const initialDoc = hash === 'help' ? helpInput : hash === '' ? '' : Base64.decode(hash);
editor.dispatch({ changes: { from: 0, insert: initialDoc } });
editor.focus();

//
// Separator drag and drop (resizing input element)
//

// https://stackoverflow.com/a/8960307
let startX = 0;
let startWidth = 0;
function startDrag(event: MouseEvent): void {
    startX = event.clientX;
    startWidth = parseInt(document.defaultView?.getComputedStyle(inputEl).width ?? '', 10);
    document.documentElement.addEventListener('mousemove', doDrag, false);
    document.documentElement.addEventListener('mouseup', stopDrag, false);
}
function stopDrag(): void {
    document.documentElement.removeEventListener('mousemove', doDrag, false);
    document.documentElement.removeEventListener('mouseup', stopDrag, false);
}
function doDrag(event: MouseEvent): void {
    inputEl.style.width = startWidth + event.clientX - startX + 'px';
}
separatorEl.addEventListener('mousedown', startDrag, false);

//
// Service Worker
//

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(new URL('./serviceWorker.js', import.meta.url), { type: 'module' });
    });
}
