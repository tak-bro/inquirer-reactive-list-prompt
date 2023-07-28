import { Answers, ListQuestionOptions } from 'inquirer';
import Base from 'inquirer/lib/prompts/base.js';
import { Interface as ReadLineInterface } from 'readline';

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
}

declare module 'inquirer' {
    interface MutableListPromptOptions<T extends Answers = Answers> extends ListQuestionOptions<T> {}

    interface MutableListPrompt<T extends Answers = Answers> extends MutableListPromptOptions<T> {
        type: 'mutable-list';
        emptyMessage?: string;
    }

    interface QuestionMap<T extends Answers = Answers> {
        mutableList: MutableListPrompt<T>;
    }
}

export class MutableListPrompt extends Base<ListQuestionOptions & MutableListConfig> {
    private emptyMessage: string;
    private done: (...args: any[]) => void;

    constructor(question: ListQuestionOptions, readLine: ReadLineInterface, answers: Answers) {
        super(question, readLine, answers);
        this.opt.choices = this.opt.choices ?? [];
        this.emptyMessage = this.opt.emptyMessage ?? 'No choices';
    }

    addChoice(choice: Choice) {
        this.opt.choices.push(choice);
        return this.render();
    }

    removeChoice(choice: Choice) {
        this.opt.choices.choices = cleanUpList(this.opt.choices.choices, choice);
        this.opt.choices.realChoices = cleanUpList(this.opt.choices.realChoices, choice);
        return this.render();
    }

    render() {
        const content = this.isEmptyChoices ? this.emptyMessage : this.getQuestion();
        return this.screen.render(content, '');
    }

    _run(cb: (...args: any[]) => void): MutableListPrompt {
        this.done = cb;
        this.render();
        super._run(cb);
        return this;
    }

    private get isEmptyChoices() {
        return this.opt.choices.length === 0;
    }
}
