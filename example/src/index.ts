import inquirer from 'inquirer';
import { MutableListLoader, MutableListPrompt } from 'inquirer-reactive-list-prompt';
import Choices from 'inquirer/lib/objects/choices.js';
import { BehaviorSubject } from 'rxjs';

const choices$: BehaviorSubject<Choices> = new BehaviorSubject<Choices>([] as any);
const loader$: BehaviorSubject<MutableListLoader> = new BehaviorSubject<MutableListLoader>({
    isLoading: false,
    message: 'AI is analyzing...',
});

inquirer.registerPrompt('mutable-list', MutableListPrompt);
const mutableList = inquirer.prompt({
    type: 'mutable-list',
    name: 'test',
    message: 'Select AI message',
    emptyMessage: 'Nothing to show',
    choices$,
    loader$,
});

mutableList.then((answer: any) => {
    choices$.complete();
    loader$.complete();
    console.log('answer: ', answer);
});

setTimeout(() => {
    loader$.next({ isLoading: true });
    choices$.next([
        { name: 'test1', value: 'test1' },
        new inquirer.Separator(),
        { name: 'test2', value: 'test2' },
        { name: 'test3', value: 'test3', disabled: true },
    ] as any);
}, 2000);

setTimeout(() => {
    choices$.next([
        { name: 'test4', value: 'test4' },
        { name: 'test5', value: 'test5', disabled: true },
        { name: 'test6', value: 'test6' },
    ] as any);
}, 5000);

setTimeout(() => {
    loader$.next({ isLoading: false, message: 'AI is analyzed' });
}, 5500);
