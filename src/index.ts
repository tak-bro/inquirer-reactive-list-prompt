import chalk from 'chalk';
import cliCursor from 'cli-cursor';
import type { Question } from 'inquirer';
import inquirer, { Answers, ListQuestionOptions } from 'inquirer';
import Choices from 'inquirer/lib/objects/choices.js';
import Base from 'inquirer/lib/prompts/base.js';
import observe from 'inquirer/lib/utils/events.js';
import incrementListIndex from 'inquirer/lib/utils/incrementListIndex.js';
import Paginator from 'inquirer/lib/utils/paginator.js';
import ora, { Options, Ora } from 'ora';
import { Interface as ReadLineInterface } from 'readline';
import { BehaviorSubject, Subscription, take } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { listRender } from './utils/index.js';

export interface StopSpinnerOption {
    doneFrame?: string;
    color?: 'black' | 'green' | 'red' | 'yellow' | 'blue' | 'cyan' | 'white';
}

export interface ReactiveListLoader {
    isLoading: boolean;
    message?: string;
    startOption?: Options;
    stopOption?: StopSpinnerOption;
}

// NOTE: type error on inquirer
export type ReactiveListChoice = any;
//
// export interface ReactiveListPromptQuestionOptions<T extends Answers = Answers> extends Question<T> {
//     type: "reactiveListPrompt";
//     pageSize?: number;
//     choices$?: BehaviorSubject<ReactiveListChoice[]>;
//     loader$?: BehaviorSubject<MutableListLoader>;
//     emptyMessage?: string;
// }

// declare module 'inquirer' {
//     interface QuestionMap<T> {
//         reactiveListPrompt: ReactiveListPromptQuestionOptions;
//     }
// }

declare module 'inquirer' {
    interface MutableListPromptOptions<T extends Answers = Answers> extends ListQuestionOptions<T> {}

    // interface MutableListPrompt<T extends Answers = Answers> extends MutableListPromptOptions<T> {
    //     type: 'reactiveListPrompt';
    //     choices$?: BehaviorSubject<ReactiveListChoice[]>;
    //     loader$?: BehaviorSubject<MutableListLoader>;
    //     emptyMessage?: string;
    //     // fix for @types/inquirer
    //     pageSize?: number;
    // }

    interface ReactiveListPromptQuestionOptions<T extends Answers = Answers> extends Question<T> {
        type: 'reactiveListPrompt';
        pageSize?: number;
        choices$?: BehaviorSubject<ReactiveListChoice[]>;
        loader$?: BehaviorSubject<ReactiveListLoader>;
        emptyMessage?: string;
    }

    interface QuestionMap<T extends Answers = Answers> {
        reactiveListPrompt: ReactiveListPromptQuestionOptions<T>;
        // mutableList: MutableListPrompt<T>;
    }
}

class ReactiveListPrompt<T extends Answers> extends Base {
    declare opt: inquirer.prompts.PromptOptions & {
        pageSize: number;
        choices$: BehaviorSubject<ReactiveListChoice[]>;
        loader$: BehaviorSubject<ReactiveListLoader>;
        emptyMessage: string;
    };

    private emptyMessage: string;
    private loader$: BehaviorSubject<ReactiveListLoader>;
    private choices$: BehaviorSubject<ReactiveListChoice[]>;
    private spinner?: Ora;
    private isLoading: boolean = false;
    private stopOption: StopSpinnerOption = {
        doneFrame: '✔',
        color: 'green',
    };

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

        this.emptyMessage = this.opt.emptyMessage ?? 'No choices';
        if (this.opt.choices$) {
            this.initChoices(answers);
        }
        if (this.opt.loader$) {
            this.initLoader();
        }

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

    setLoader(loader: ReactiveListLoader) {
        const { isLoading, message } = loader;
        if (!this.spinner) {
            return;
        }
        // do nothing
        if (this.isLoading === isLoading) {
            return;
        }

        this.isLoading = isLoading;
        this.stopOption = loader.stopOption ? { ...this.stopOption, ...loader.stopOption } : this.stopOption;
        if (!this.isLoading) {
            // this.spinner.indent = 0;
            this.spinner.text = `${chalk.bold(chalk[this.stopOption.color](message))}`;
            // this.spinner.suffixText = `${chalk.bold(chalk.green(message))}`;

            // this.spinner.stopAndPersist({
            //     symbol: "✨",
            //     text: `${chalk.bold(chalk.green(message))}`
            // })

            this.spinner.color = this.stopOption.color;
            this.spinner.spinner = { interval: 0, frames: [this.stopOption.doneFrame] };
            return this;
        }
        if (this.spinner.isSpinning) {
            return this;
        }
        this.spinner.start();
        // this.render('AI is analyzing...')
        return this;
    }

    setChoices(choices: ReactiveListChoice[]) {
        const hasNoChoices = !choices || choices.length === 0;
        if (hasNoChoices) {
            this.opt.choices = new Choices([], this.answers) as any;
            return;
        }
        this.opt.choices = new Choices(choices, this.answers) as any;
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
        if (this.loader$) {
            const loaderSubscription = this.loader$.subscribe(this.setLoader.bind(this));
            this.subscriptions.push(loaderSubscription);
        }

        cliCursor.hide();
        this.render();

        return this;
    }

    unsubscribe() {
        this.subscriptions?.forEach(sub => sub.unsubscribe());
    }

    render(error?: string) {
        if (this.isEmptyChoices) {
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
        if (this.loader$) {
            this.screen.render(`${message}\n`, bottomContent);
            return;
        }
        this.screen.render(`${message}`, bottomContent);
    }

    onSubmit(value) {
        if (this.isEmptyChoices) {
            return;
        }
        this.status = 'answered';

        // Rerender prompt
        this.render();

        if (this.spinner) {
            this.spinner.isSpinning && this.spinner.stop();
            this.spinner.clear();
        }

        this.unsubscribe();
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
        if (this.isEmptyChoices) {
            return;
        }
        this.selected = incrementListIndex(this.selected, 'up', this.opt);
        this.render();
    }

    onDownKey() {
        if (this.isEmptyChoices) {
            return;
        }
        this.selected = incrementListIndex(this.selected, 'down', this.opt);
        this.render();
    }

    onNumberKey(input) {
        if (this.isEmptyChoices) {
            return;
        }
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

    private initChoices(answers: Answers) {
        this.choices$ = this.opt.choices$;
        this.opt.choices$
            .asObservable()
            .pipe(take(1))
            .subscribe((choices: ReactiveListChoice[]) => {
                const hasNoChoices = !choices || choices.length === 0;
                if (hasNoChoices) {
                    this.opt.choices = new Choices([], answers);
                    return;
                }
                this.opt.choices = new Choices(choices, answers);
            });
    }

    private initLoader() {
        this.loader$ = this.opt.loader$;
        this.loader$
            .asObservable()
            .pipe(take(1))
            .subscribe(loader => {
                this.isLoading = loader.isLoading;
                // set start ora option
                const text = 'Loading...';
                this.spinner = loader.startOption ? ora({ text, ...loader.startOption }) : ora({ text });

                if (loader.stopOption) {
                    this.stopOption = { ...this.stopOption, ...loader.stopOption };
                }
            });
    }
}

export default ReactiveListPrompt;
