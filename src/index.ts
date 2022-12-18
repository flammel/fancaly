import { Base64 } from 'js-base64';
import { helpInput } from './help';
import { makeEditor } from './editor';

const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;
const separatorEl = document.getElementById('separator') as HTMLDivElement;

//
// Editor
//

const editor = makeEditor((notazaState) => {
    window.location.hash = Base64.encode(notazaState.input);
    outputEl.innerHTML = notazaState.output
        .map((line) => `<span>${line === '' ? '&nbsp;' : line}</span>`)
        .join('');
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
