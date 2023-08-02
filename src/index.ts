import chalk from 'chalk';
import cliCursor from 'cli-cursor';
import type { Question } from 'inquirer';
import inquirer, { Answers, ListQuestionOptions } from 'inquirer';
import Choice from 'inquirer/lib/objects/choice.js';
import Choices from 'inquirer/lib/objects/choices.js';
import Base from 'inquirer/lib/prompts/base.js';
import observe from 'inquirer/lib/utils/events.js';
import incrementListIndex from 'inquirer/lib/utils/incrementListIndex.js';
import Paginator from 'inquirer/lib/utils/paginator.js';
import { Ora } from 'ora';
import { Interface as ReadLineInterface } from 'readline';
import { Subject, Subscription, take } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { cleanUpList, listRender } from './utils/index.js';

declare module 'inquirer' {
    interface MutableListPromptOptions<T extends Answers = Answers> extends ListQuestionOptions<T> {}

    interface MutableListPrompt<T extends Answers = Answers> extends MutableListPromptOptions<T> {
        type: 'mutable-list';
        // fix for @types/inquirer
        pageSize?: number;
        choices$?: Subject<Choices>;
        emptyMessage?: string;
        // addChoice$?: Subject<any>;
        // removeChoice$?: Subject<any>;
    }

    interface QuestionMap<T extends Answers = Answers> {
        mutableList: MutableListPrompt<T>;
    }
}

export class MutableListPrompt extends Base {
    declare opt: inquirer.prompts.PromptOptions & {
        pageSize: number;
        choices$: Subject<Choices>;
        emptyMessage: string;
        // addChoice$: Subject<any>;
        // removeChoice$: Subject<any>;
    };

    private emptyMessage: string;
    private choices$: Subject<Choices>;
    // TODO:
    private spinner?: Ora;
    private firstRender: boolean = true;
    private selected: number = 0;
    private done: (...args: any[]) => void;
    private paginator: Paginator;
    private subscriptions: Subscription[];

    constructor(question: Question, readLine: ReadLineInterface, answers: Answers) {
        super(question, readLine, answers);
        if (!this.opt.choices$ && !this.opt.choices) {
            this.throwParamError('choices');
        }
        if (this.opt.choices$) {
            this.opt.choices$
                .asObservable()
                .pipe(take(1))
                .subscribe((choices: any) => {
                    this.opt.choices = new Choices(choices, answers);
                });
        }
        // set choices
        this.emptyMessage = this.opt.emptyMessage ?? 'No choices';
        this.choices$ = this.opt.choices$ ?? new Subject();

        const def = this.opt.default;
        // If def is a Number, then use as index. Otherwise, check for value.
        if (typeof def === 'number' && def >= 0 && def < this.opt.choices.realLength) {
            this.selected = def;
        } else if (typeof def !== 'number' && def != null) {
            const index = this.opt.choices.realChoices.findIndex(({ value }) => value === def);
            this.selected = Math.max(index, 0);
        }

        this.opt.default = null;
        const shouldLoop = this.opt['loop'] === undefined ? true : this.opt['loop'];
        this.paginator = new Paginator(this.screen, { isInfinite: shouldLoop });
    }

    addChoice(choice: Choice) {
        this.opt.choices.push(choice);
        this.render();
        return this;
    }

    removeChoice(choice: Choice) {
        const removedChoices = cleanUpList(this.opt.choices.choices, choice);
        if (removedChoices.length === 0) {
            this.render('At least one choice!');
            return this;
        }
        this.opt.choices.choices = cleanUpList(this.opt.choices.choices, choice);
        this.opt.choices.realChoices = cleanUpList(this.opt.choices.realChoices, choice);
        this.render();
        return this;
    }

    setChoices(choices: any) {
        this.opt.choices.choices = choices;
        this.opt.choices.realChoices = choices;
        this.render();
        return this;
    }

    _run(cb) {
        this.done = cb;

        const events = observe(this.rl);
        events.normalizedUpKey.pipe(takeUntil(events.line)).forEach(this.onUpKey.bind(this));
        events.normalizedDownKey.pipe(takeUntil(events.line)).forEach(this.onDownKey.bind(this));
        events.numberKey.pipe(takeUntil(events.line)).forEach(this.onNumberKey.bind(this));

        const validation = this.handleSubmitEvents(events.line.pipe(map(this.getCurrentValue.bind(this))));

        validation.success.forEach(this.onSubmit.bind(this));
        validation.error.forEach(this.onError.bind(this));

        // const addChoiceSubscription = this.addChoice$.subscribe(this.addChoice.bind(this));
        // const removeChoiceSubscription = this.removeChoice$.subscribe(this.removeChoice.bind(this));
        // this.subscriptions = [addChoiceSubscription, removeChoiceSubscription];
        const choicesSubscription = this.choices$.subscribe(this.setChoices.bind(this));
        this.subscriptions = [choicesSubscription];

        cliCursor.hide();
        this.render();

        return this;
    }

    unsubscribe() {
        this.subscriptions?.forEach(sub => sub.unsubscribe());
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
            (this.opt.choices as any).reduce((acc, value, i) => {
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
        this.unsubscribe();
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
        if (!this.opt.choices) {
            return true;
        }
        return this.opt.choices.length === 0;
    }
}
