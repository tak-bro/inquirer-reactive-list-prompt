import chalk from 'chalk';
import figures from 'figures';
import cliCursor from 'cli-cursor';
import type inquirer from 'inquirer';
import { Answers, ListQuestionOptions } from 'inquirer';
import Base from 'inquirer/lib/prompts/base.js';
import observe from 'inquirer/lib/utils/events.js';
import incrementListIndex from 'inquirer/lib/utils/incrementListIndex.js';
import Paginator from 'inquirer/lib/utils/paginator.js';
import { Ora } from 'ora';
import { Interface as ReadLineInterface } from 'readline';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

export type Choice = any;

const cleanUpList = (choices: any, choice: Choice) => {
    return choices.filter((origin: Choice) => {
        const { name, value } = choice;
        if (!name || !value) {
            return true;
        }
        return !(origin.name === name && origin.value === value);
    });
};

export interface MutableListConfig {
    emptyMessage?: string;
    ora?: Ora;
    choicesSubject?: Subject<any[]>;
}

declare module 'inquirer' {
    interface MutableListPromptOptions<T extends Answers = Answers> extends ListQuestionOptions<T> {}

    interface MutableListPrompt<T extends Answers = Answers> extends MutableListPromptOptions<T> {
        type: 'mutable-list';
        emptyMessage?: string;
        ora?: Ora;
        choicesSubject?: Subject<any[]>;
    }

    interface QuestionMap<T extends Answers = Answers> {
        /**
         * The `MutableListPrompt` type.
         */
        mutableList: MutableListPrompt<T>;
        run: any;
        addChoice: any;
    }
}

export class MutableListPrompt extends Base<ListQuestionOptions & MutableListConfig> {
    declare opt: inquirer.prompts.PromptOptions & { emptyMessage: string; ora: Ora; choicesSubject: Subject<any[]> };

    firstRender: boolean;
    emptyMessage: string;
    selected: number;
    choicesSubject: Subject<any[]>;
    // addChoice: any;
    // removeChoice: any;
    private done: (...args: any[]) => void;
    private spinner?: Ora;
    private paginator: Paginator = new Paginator();

    constructor(question: ListQuestionOptions, readLine: ReadLineInterface, answers: Answers) {
        super(question, readLine, answers);
        this.opt.choices = this.opt.choices ?? [];
        this.emptyMessage = this.opt.emptyMessage ?? 'No choices';
        this.choicesSubject = this.opt.choicesSubject ?? new Subject();

        this.selected = 0;
        this.firstRender = true;

        const def = this.opt.default;

        // If def is a Number, then use as index. Otherwise, check for value.
        if (typeof def === 'number' && def >= 0 && def < this.opt.choices.realLength) {
            this.selected = def;
        } else if (typeof def !== 'number' && def != null) {
            const index = this.opt.choices.realChoices.findIndex(({ value }) => value === def);
            this.selected = Math.max(index, 0);
        }

        this.opt.default = null;
        const shouldLoop = this.opt.loop === undefined ? true : this.opt.loop;
        this.paginator = new Paginator(this.screen, { isInfinite: shouldLoop });
    }

    addChoice(choice: Choice) {
        this.opt.choices.push(choice);
        this.render();
        return this;
    }

    removeChoice(choice: Choice) {
        this.opt.choices.choices = cleanUpList(this.opt.choices.choices, choice);
        this.opt.choices.realChoices = cleanUpList(this.opt.choices.realChoices, choice);
        this.render();
        return this;
    }

    _run(cb) {
        this.done = cb;
        // Init the prompt
        this.addChoice.bind(this);
        this.removeChoice.bind(this);
        this.choicesSubject.subscribe(choice => {
            this.addChoice(choice);
        });

        const events = observe(this.rl);
        events.normalizedUpKey.pipe(takeUntil(events.line)).forEach(this.onUpKey.bind(this));
        events.normalizedDownKey.pipe(takeUntil(events.line)).forEach(this.onDownKey.bind(this));
        events.numberKey.pipe(takeUntil(events.line)).forEach(this.onNumberKey.bind(this));

        const validation = this.handleSubmitEvents(events.line.pipe(map(this.getCurrentValue.bind(this))));

        validation.success.forEach(this.onSubmit.bind(this));
        validation.error.forEach(this.onError.bind(this));

        cliCursor.hide();
        this.render();

        return this;
    }

    render(error?: string) {
        if (this.isEmptyChoices) {
            console.log('isEmptyChoices', this.isEmptyChoices);
            return this.screen.render(this.opt.emptyMessage, '');
        }

        // Render question
        let message = this.getQuestion();
        let bottomContent = '';
        if (this.firstRender) {
            message += chalk.dim('(Use arrow keys)');
        }
        if (this.status === 'answered') {
            message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
        }
        const choicesStr = listRender(this.opt.choices, this.selected);
        const indexPosition = this.opt.choices.indexOf(this.opt.choices.getChoice(this.selected) as any);
        const realIndexPosition =
            this.opt.choices.reduce((acc, value, i) => {
                // Dont count lines past the choice we are looking at
                if (i > indexPosition) {
                    return acc;
                }
                // Add line if it's a separator
                if (value.type === 'separator') {
                    return acc + 1;
                }

                let l = value.name;
                // Non-strings take up one line
                if (typeof l !== 'string') {
                    return acc + 1;
                }

                // Calculate lines taken up by string
                l = l.split('\n');
                return acc + l.length;
            }, 0) - 1;
        message += '\n' + this.paginator.paginate(choicesStr, realIndexPosition, this.opt.pageSize);

        if (error) {
            bottomContent += '\n' + chalk.red('>> ') + error;
        }

        this.firstRender = false;
        this.screen.render(message, bottomContent);
    }

    onSubmit(value) {
        if (this.isEmptyChoices) {
            return;
        }
        this.status = 'answered';

        // Rerender prompt
        this.render();

        this.screen.done();
        cliCursor.show();
        this.done(value);
    }

    onError(state) {
        this.render(state.isValid);
    }

    getCurrentValue() {
        if (this.isEmptyChoices) {
            return null;
        }
        return this.opt.choices.getChoice(this.selected).value;
    }

    onUpKey() {
        this.selected = incrementListIndex(this.selected, 'up', this.opt);
        this.render();
    }

    onDownKey() {
        this.selected = incrementListIndex(this.selected, 'down', this.opt);
        this.render();
    }

    onNumberKey(input) {
        if (input <= this.opt.choices.realLength) {
            this.selected = input - 1;
        }

        this.render();
    }

    private get isEmptyChoices() {
        return this.opt.choices.length === 0;
    }
}

function listRender(choices, pointer) {
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
            output += '  - ' + choice.name;
            output += ` (${typeof choice.disabled === 'string' ? choice.disabled : 'Disabled'})`;
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

// export class MutableListPrompt extends Base<ListQuestionOptions & MutableListConfig> {
//     private emptyMessage: string;
//     private done: (...args: any[]) => void;
//
//     constructor(question: ListQuestionOptions, readLine: ReadLineInterface, answers: Answers) {
//         super(question, readLine, answers);
//         this.opt.choices = this.opt.choices ?? [];
//         this.opt.default = null;
//         this.emptyMessage = this.opt.emptyMessage ?? 'No choices';
//     }
//
//     public addChoice(choice: Choice) {
//         return this.opt.choices.push(choice);
//     }
//
//     public removeChoice(choice: Choice) {
//         this.opt.choices.choices = cleanUpList(this.opt.choices.choices, choice);
//         return this.opt.choices.realChoices = cleanUpList(this.opt.choices.realChoices, choice);
//     }
//
//     public render() {
//         // return super.render(...arguments);
//         const content = this.isEmptyChoices ? this.emptyMessage : this.getQuestion();
//         return this.screen.render(content, '');
//     }
//
//     run() {
//         return new Promise((resolve, reject) => {
//             // this.ui.close();
//
//         })
//     }
//
//     // _run(cb: (...args: any[]) => void): MutableListPrompt {
//     //     this.done = cb;
//     //     this.render();
//     //     this.addChoice.bind(this)
//     //     console.log('this', this);
//     //     return this;
//     // }
//
//     private get isEmptyChoices() {
//         return this.opt.choices.length === 0;
//     }
// }
