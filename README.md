# jsonrepair

Repair invalid JSON documents.

Try it out: https://josdejong.github.io/jsonrepair/

The following issues can be fixed:

- Add missing quotes around keys
- Replace single quotes with double quotes
- Turn newline delimited JSON into a valid JSON array
- Add missing escape characters
- Replace special white space characters with regular spaces
- Replace special quote characters like `“...”`  with regular double quotes
- Concatenate strings like `"long text" + "more text on next line"`
- Add missing commas
- Strip trailing commas
- Strip comments like `/* ... */` and `// ...`
- Strip JSONP notation like `callback({ ... })`
- Strip MongoDB data types like `NumberLong(2)` and `ISODate("2012-12-19T06:01:17.171Z")`
- Replace Python constants `None`, `True`, and `False` with `null`, `true`, and `false`


## Install

```
$ npm install jsonrepair
```

Note that in the `lib` folder, there are builds for ESM, UMD, and CommonJs.


## Use

```js
import jsonrepair from 'jsonrepair'

// The following is invalid JSON: is consists of JSON contents copied from 
// a JavaScript code base, where the keys are missing double quotes, 
// and strings are using single quotes:
const json = '{name: \'John\'}'

const repaired = jsonrepair(json)
console.log(repaired) // '{"name": "John"}'
```


### API

```
jsonrepair(json: string) : string
```

The function `jsonrepair` throws an exception when an issue is encountered
which could not be solved. When no error is thrown, the output will be valid JSON.


### Develop

To build the library (ESM, CommonJs, and UMD output in the folder `lib`):

```
$ npm install 
$ npm run build
```

To run the unit tests:

```
$ npm test
```

To run the linter (eslint):

```
$ npm run lint
```

To run the linter, build all, and run unit tests and integration tests:

```
$ npm run build-and-test
```


## License

Released under the [ISC license](LICENSE.md).
