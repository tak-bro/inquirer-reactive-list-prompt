import inquirer from 'inquirer';
import ReactiveListPrompt, { MutableListLoader, ReactiveListChoice } from 'inquirer-reactive-list-prompt';
import { BehaviorSubject } from 'rxjs';

const choices$: BehaviorSubject<ReactiveListChoice[]> = new BehaviorSubject<ReactiveListChoice[]>([]);
const loader$: BehaviorSubject<MutableListLoader> = new BehaviorSubject<MutableListLoader>({
    isLoading: false,
    message: 'AI is analyzing...',
    doneFrame: 'D',
});

inquirer.registerPrompt('reactiveListPrompt', ReactiveListPrompt);
const mutableList = inquirer.prompt({
    type: 'reactiveListPrompt',
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
    ]);
}, 2000);

setTimeout(() => {
    choices$.next([
        { name: 'test4', value: 'test4' },
        { name: 'test5', value: 'test5', disabled: true },
        { name: 'test6', value: 'test6' },
    ]);
}, 5000);

setTimeout(() => {
    loader$.next({ isLoading: false, message: 'AI is analyzed' });
}, 5500);
