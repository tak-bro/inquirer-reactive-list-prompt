import inquirer from 'inquirer';
import { MutableListPrompt } from 'inquirer-mutable-list';
import Choices from 'inquirer/lib/objects/choices.js';
import { Subject } from 'rxjs';

const choices$: Subject<any> = new Subject<Choices>();

inquirer.registerPrompt('mutable-list', MutableListPrompt);
const mutableList = inquirer.prompt({
    type: 'mutable-list',
    name: 'test',
    message: 'Select AI message',
    emptyMessage: 'Nothing to show',
    choices$,
});

setTimeout(() => {
    choices$.next([
        { name: 'test1', value: 'test1' },
        { name: 'test2', value: 'test2' },
        { name: 'test3', value: 'test3', disabled: true },
    ]);
}, 2000);

mutableList.then((answer: any) => {
    console.log('123', answer);
});

setTimeout(() => {
    choices$.next([
        { name: 'tes2', value: 'tes5' },
        { name: 'tes3', value: 'tes4' },
    ]);
}, 5000);
//
// const mutableList2 =  inquirer.prompt({
//     type: 'mutable-list',
//     name: 'test',
//     message: 'Select AI message',
//     emptyMessage: 'Nothing to show',
//     choices: [],
// });
// mutableList2.then((answer: any) => {
//     console.log('123', answer);
// })
//
// const mutable = new MutableListPrompt({
//     type: 'mutable-list',
//     name: 'test',
//     message: 'Select AI message',
//     // emptyMessage: 'Nothing to show',
//     choices: [{name: 'test', value: 'test' }],
// })
// mutable.addChoice({name: 'test1', value: 'test2'});
// mutable.run().then((answer: any) => {
//     console.log('123', answer);
// })
// // mutableList.addChoice({name: 'testr1', value: 'testr3'});
// // mutableList.addChoice({name: 'testr2', value: 'testr4'});
