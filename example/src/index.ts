import inquirer from 'inquirer';
import { MutableListPrompt } from 'inquirer-mutable-list';
import { Subject } from 'rxjs';

const choices$: Subject<any> = new Subject<any>();

inquirer.registerPrompt('mutable-list', MutableListPrompt);
const mutableList = inquirer.prompt({
    type: 'mutable-list',
    name: 'test',
    message: 'Select AI message',
    emptyMessage: 'Nothing to show',
    choices: [
        { name: 'test', value: 'test' },
        { name: 'tes1', value: 'tes6' },
        { name: 'tes2', value: 'tes5' },
        { name: 'tes3', value: 'tes4' },
    ],
    addChoice$: choices$,
    removeChoice$: choices$,
});

setTimeout(() => {
    choices$.next({ name: 'test', value: 'test' });
}, 2000);

setTimeout(() => {
    choices$.next({ name: 'tes3', value: 'tes4' });
}, 1000);
// mutableList.addChoice({name: 'please', value: 'please'});
mutableList.then((answer: any) => {
    console.log('123', answer);
});
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
