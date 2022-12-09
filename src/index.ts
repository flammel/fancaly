import {LanguageSupport, LRLanguage, syntaxTree} from "@codemirror/language"
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { buildParser } from '@lezer/generator';
import { SyntaxNode } from '@lezer/common';
import { Base64 } from 'js-base64';
import { execute } from './execute';
import { helpInput } from './help';

const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;
const separatorEl = document.getElementById('separator') as HTMLDivElement;

//
// Codemirror
//

const grammar = `
@precedence { times @left, plus @left }

@top Program { (Line lineEnd)* }

Line { Assignment | expression }
Assignment { Name "=" expression }
expression { Name | Number | BinaryExpression | "(" expression ")" }

BinaryExpression {
    expression !times "*" expression |
    expression !times "/" expression |
    expression !plus "+" expression |
    expression !plus "-" expression
}

@skip { space }

@tokens {
    "+"
    "-"
    "*"
    "/"
  Name { @asciiLetter+ }
  Number { @digit+ $[.,]? @digit* }
  space { " "+ }
  lineEnd { @eof|"\n" }
}
`;
const parser = buildParser(grammar);
const notazaLanguage = LRLanguage.define({
    parser: parser,
});
const notazaLanguageSupport = new LanguageSupport(notazaLanguage);

const editor = new EditorView({
    parent: document.getElementById('input') as HTMLDivElement,
    state: EditorState.create({
        extensions: [
            notazaLanguageSupport,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const tree = syntaxTree(update.state);
                    const input = update.state.doc.toString();
                    console.log(tree);
                    console.log(tree.topNode.toString());
                    console.log(JSON.stringify(printTree(tree.topNode, input), undefined, 4));
                    outputEl.innerHTML = execute(input);
                    window.location.hash = Base64.encode(input);
                }
            }),
        ],
    }),
});

function printTree(tree: SyntaxNode, input: string): any {
    const children = (tree: SyntaxNode) => {
        const cs = [];
        let c = tree.firstChild;
        while (c) {
            cs.push(c);
            c = c.nextSibling;
        }
        return cs;
    }
    const x = {
        type: tree.type.name,
        value: input.slice(tree.from, tree.to),
        children: children(tree).map((c) => printTree(c, input)),
    }

    return x;
}

const hash = window.location.hash.substring(1);
const initialDoc = hash === 'help' ? helpInput : (hash === '' ? '' : Base64.decode(hash));
editor.dispatch({changes: {from: 0, insert: initialDoc}});
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
