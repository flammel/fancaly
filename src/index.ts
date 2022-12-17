import { EditorState } from '@codemirror/state';
import { Decoration, EditorView, MatchDecorator, ViewPlugin } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { Base64 } from 'js-base64';
import { execute } from './execute';
import { helpInput } from './help';

const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;
const separatorEl = document.getElementById('separator') as HTMLDivElement;

//
// Editor
//

const numMark = Decoration.mark({ class: 'num' });
const numMDecorator = new MatchDecorator({
    regexp: /\d+/g,
    decoration: () => numMark,
});
const highlighting = ViewPlugin.define(
    (view) => ({
        decorations: numMDecorator.createDeco(view),
        update(update) {
            console.log(update.state.doc.toString());
            // this.decorations = Decoration.set([numMark.range(0, 10)]);
            this.decorations = numMDecorator.updateDeco(update, this.decorations);
        },
    }),
    {
        decorations: (v) => v.decorations,
    },
);

// const notazaStyle = HighlightStyle.define([
//     { tag: tags.lineComment, color: '#1e293b' },
//     { tag: tags.variableName, color: 'rgb(16 185 129)' },
//     { tag: tags.number, color: '#3a3daa' },
//     { tag: tags.operator, color: '#c544d4' },
//     { tag: tags.operatorKeyword, color: '#f8af41' },
//     { tag: tags.typeName, color: 'rgb(59 130 246)' },
//     { tag: tags.paren, color: '#c544d4' },
// ]);

const editor = new EditorView({
    parent: document.getElementById('input') as HTMLDivElement,
    state: EditorState.create({
        extensions: [
            history(),
            highlighting,
            // syntaxHighlighting(notazaStyle),
            // new LanguageSupport(notazaLanguage),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const input = update.state.doc.toString();
                    window.location.hash = Base64.encode(input);
                    outputEl.innerHTML = execute(input)
                        .map((line) => `<span>${line}</span>`)
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
