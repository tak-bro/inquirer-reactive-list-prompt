import inquirer from 'inquirer';
import ReactiveListPrompt, { ChoiceItem, ReactiveListLoader } from 'inquirer-reactive-list-prompt';
import { BehaviorSubject } from 'rxjs';

const choices$: BehaviorSubject<ChoiceItem[]> = new BehaviorSubject<ChoiceItem[]>([]);
const loader$: BehaviorSubject<ReactiveListLoader> = new BehaviorSubject<ReactiveListLoader>({
    isLoading: false,
    message: 'AI is analyzing...',
    // startOption: {
    //     color: 'red',
    //     spinner: 'triangle'
    // },
    // stopOption: {
    //     doneFrame: '✖',
    //     color: 'red'
    // }
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
        { name: 'test6', value: 'test6', disabled: true, isError: true },
    ]);
}, 5000);

setTimeout(() => {
    loader$.next({
        isLoading: false,
        message: 'AI is analyzed',
        // stopOption: {
        //     doneFrame: '⚠', // '✖'
        //     color: 'yellow' // 'red'
        // }
    });
}, 6000);
