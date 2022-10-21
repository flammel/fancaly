import { Base64 } from 'js-base64';
import { execute } from './execute';
import { helpInput } from './help';

const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;

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

const hash = window.location.hash.substring(1);
if (hash === 'help') {
    inputEl.value = helpInput;
    debouncedListener();
} else if (hash !== '') {
    inputEl.value = Base64.decode(hash);
    debouncedListener();
}
