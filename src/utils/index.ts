import chalk from 'chalk';
import figures from 'figures';
import Choices from 'inquirer/lib/objects/choices.js';

export function listRender(choices: Choices, pointer: number) {
    let output = '';
    let separatorOffset = 0;

    choices.forEach((choice, i) => {
        if (choice.type === 'separator') {
            separatorOffset++;
            output += '  ' + choice + '\n';
            return;
        }

        if (choice.disabled) {
            separatorOffset++;
            output += chalk.dim(
                `  ${choice.name}  (${typeof choice.disabled === 'string' ? choice.disabled : 'Disabled'})`
            );
            // output += '  - ' + choice.name;
            // output += ` (${typeof choice.disabled === 'string' ? choice.disabled : 'Disabled'})`;
            output += '\n';
            return;
        }

        const isSelected = i - separatorOffset === pointer;
        let line = (isSelected ? figures.pointer + ' ' : '  ') + choice.name;
        if (isSelected) {
            line = chalk.cyan(line);
        }

        output += line + ' \n';
    });

    return output.replace(/\n$/, '');
}
