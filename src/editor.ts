import { HighlightStyle, LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { notazaLanguage } from './language';

const notazaStyle = HighlightStyle.define([
    { tag: tags.lineComment, color: '#1e293b' },
    { tag: tags.variableName, color: 'rgb(16 185 129)' },
    { tag: tags.number, color: '#3a3daa' },
    { tag: tags.operator, color: '#c544d4' },
    { tag: tags.operatorKeyword, color: '#f8af41' },
    { tag: tags.typeName, color: 'rgb(59 130 246)' },
    { tag: tags.paren, color: '#c544d4' },
]);

export function createEditor(onChange: (input: string) => unknown): EditorView {
    return new EditorView({
        parent: document.getElementById('input') as HTMLDivElement,
        state: EditorState.create({
            extensions: [
                history(),
                syntaxHighlighting(notazaStyle),
                new LanguageSupport(notazaLanguage),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),
            ],
        }),
    });
}
