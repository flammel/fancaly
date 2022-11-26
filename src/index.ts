import { Base64 } from 'js-base64';
import { execute } from './execute';
import { helpInput } from './help';

const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;
const separatorEl = document.getElementById('separator') as HTMLDivElement;

//
// Automatic resizing of input element to show all lines
//

function resizeInput(): void {
    inputEl.style.height = '0';
    inputEl.style.height = inputEl.scrollHeight + 'px';
}
inputEl.addEventListener('input', resizeInput);

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
// Compute output when input changes
//

const debounce = (fn: () => unknown, ms: number) => {
    let timeoutId: number;
    return () => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(fn, ms);
    };
};

const debouncedListener = debounce(() => {
    outputEl.value = execute(inputEl.value);
    window.location.hash = Base64.encode(inputEl.value);
}, 100);

inputEl.addEventListener('keyup', debouncedListener);

//
// Load input from url
//

const hash = window.location.hash.substring(1);
if (hash === 'help') {
    inputEl.value = helpInput;
    resizeInput();
    debouncedListener();
} else if (hash !== '') {
    inputEl.value = Base64.decode(hash);
    resizeInput();
    debouncedListener();
}

//
// Service Worker
//

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(new URL('./serviceWorker.js', import.meta.url), { type: 'module' });
    });
}
