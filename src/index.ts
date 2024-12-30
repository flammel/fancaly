import { Base64 } from 'js-base64';
import { helpInput } from './help';
import { makeEditor } from './editor';

launch();

function launch(): void {
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const separatorEl = document.getElementById('separator');
    const clearButtonEl = document.getElementById('clear-button');

    if (!(inputEl instanceof HTMLDivElement)) {
        throw new Error('inputEl not found');
    }

    if (!(outputEl instanceof HTMLDivElement)) {
        throw new Error('outputEl not found');
    }

    if (!(separatorEl instanceof HTMLElement)) {
        throw new Error('separatorEl not found');
    }

    if (!(clearButtonEl instanceof HTMLButtonElement)) {
        throw new Error('clearButtonEl must be a button');
    }

    setUpEditor(inputEl, outputEl, clearButtonEl);
    setUpSeparator(inputEl, separatorEl);
    setUpServiceWorker();
}

function setUpEditor(inputEl: HTMLDivElement, outputEl: HTMLDivElement, clearButtonEl: HTMLButtonElement): void {
    const editor = makeEditor(inputEl, (notazaState) => {
        window.location.hash = Base64.encode(notazaState.input);
        window.localStorage.setItem('fancaly-content', notazaState.input);
        outputEl.innerHTML = notazaState.output.map((line) => `<span>${line === '' ? '&nbsp;' : line}</span>`).join('');
    });
    const hash = window.location.hash.substring(1);
    const stored = window.localStorage.getItem('fancaly-content') ?? '';
    const initialDoc = hash === 'help' ? helpInput : hash === '' ? stored : Base64.decode(hash);
    editor.dispatch({ changes: { from: 0, insert: initialDoc } });
    editor.focus();
    clearButtonEl.addEventListener('click', () => {
        if (confirm('Are you sure?')) {
            window.location.hash = '';
            window.localStorage.setItem('fancaly-content', '');
            editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: '' } });
            editor.focus();
        }
    });
}

function setUpSeparator(inputEl: HTMLDivElement, separatorEl: HTMLElement): void {
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
        inputEl.style.width = `${(startWidth + event.clientX - startX).toString(10)}px`;
    }
    separatorEl.addEventListener('mousedown', startDrag, false);
}

function setUpServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            void navigator.serviceWorker.register(new URL('./serviceWorker.ts', import.meta.url), { type: 'module' });
        });
    }
}
