import inquirer from 'inquirer';
import { MutableListPrompt } from 'inquirer-mutable-list';

inquirer.registerPrompt('mutable-list', MutableListPrompt);
const answer = await inquirer.prompt({
    type: 'mutable-list',
    name: 'test',
    message: 'Select AI message',
    emptyMessage: 'Nothing to show',
    choices: [],
});

console.log(answer);
