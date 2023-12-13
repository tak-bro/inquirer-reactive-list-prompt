<h1 align="center">inquirer-reactive-list-prompt</h1>

<p align="center">
  <a aria-label="npm version" href="https://npmjs.com/package/inquirer-reactive-list-prompt">
    <img alt="" src="https://badge.fury.io/js/inquirer-reactive-list-prompt.svg">
  </a>
  <a aria-label="build" href="https://github.com/tak-bro/inquirer-reactive-list-prompt">
    <img alt="" src="https://github.com/tak-bro/inquirer-reactive-list-prompt/workflows/Build/badge.svg">
  </a>
  <a aria-label="license" href="https://github.com/tak-bro/inquirer-reactive-list-prompt/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/tak-bro/inquirer-reactive-list-prompt.svg" alt="">
  </a>
</p>

> inquirer prompt for reactive choices on list

<p align="center"><img src="/example/demo.gif?raw=true"/></p>

## Installation

```
$ yarn add inquirer inquirer-reactive-list-prompt
```

## Usage

```typescript
const choices$: BehaviorSubject<ChoiceItem[]> = new BehaviorSubject<ChoiceItem[]>([]);
const loader$: BehaviorSubject<ReactiveListLoader> = new BehaviorSubject<ReactiveListLoader>({
    isLoading: false,
    message: 'fetch some items',
    startOption: {
        color: 'red',
        spinner: 'triangle',
    },
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

// update list
choices$.next([
    { name: 'test1', value: 'test1' },
    { name: 'fetching...', value: 'test2' },
    new inquirer.Separator(),
    { name: 'fetching...', value: 'test3', disabled: true },
]);
// update loader
loader$.next({ isLoading: true });

mutableList.then(value => {
    choices$.complete();
    loader$.complete();
    console.log('answer: ', value);
});
```

## Example

You can find a running example in [example](https://github.com/tak-bro/inquirer-reactive-list-prompt/blob/main/example/src/index.ts)

## Troubleshooting

Please follow this guidelines when reporting bugs and feature requests:

1. Use [GitHub Issues](https://github.com/tak-bro/inquirer-reactive-list-prompt/issues) board to report bugs and feature requests (not our email address)
2. Please **always** write steps to reproduce the error. That way we can focus on fixing the bug, not scratching our heads trying to reproduce it.

Thanks for understanding!

## Stay in touch

-   [Author](https://env-tak.github.io/)

### License

The MIT License (see the [LICENSE](https://github.com/tak-bro/inquirer-reactive-list-prompt/blob/main/LICENSE) file for the full text)
