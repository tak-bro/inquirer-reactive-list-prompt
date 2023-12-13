import inquirer from 'inquirer';
import ReactiveListPrompt, { ChoiceItem, ReactiveListLoader } from 'inquirer-reactive-list-prompt';
import { BehaviorSubject } from 'rxjs';

const choices$: BehaviorSubject<ChoiceItem[]> = new BehaviorSubject<ChoiceItem[]>([]);
const loader$: BehaviorSubject<ReactiveListLoader> = new BehaviorSubject<ReactiveListLoader>({
    isLoading: false,
    message: 'fetch some items',
    // startOption: {
    //     color: 'red',
    //     spinner: 'triangle'
    // },
});

inquirer.registerPrompt('reactiveListPrompt', ReactiveListPrompt);
const mutableList = inquirer.prompt({
    type: 'reactiveListPrompt',
    name: 'ReactiveListPrompt Example',
    message: 'Select response',
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
    choices$.next([
        { name: 'test1', value: 'test1' },
        { name: 'fetching...', value: 'test2' },
        new inquirer.Separator(),
        { name: 'fetching...', value: 'test3', disabled: true },
    ]);
    loader$.next({ isLoading: true });
}, 1000);

setTimeout(() => {
    choices$.next([
        { name: 'test1', value: 'test1' },
        { name: 'test2', value: 'test2' },
        new inquirer.Separator(),
        { name: 'get error', value: 'error', disabled: true, isError: true },
    ]);

    loader$.next({
        isLoading: false,
        message: 'get all responses',
        stopOption: {
            doneFrame: '⚠', // '✖'
            color: 'yellow', // 'red'
        },
    });
}, 3000);
