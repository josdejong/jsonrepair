# jsonrepair

Repair invalid JSON documents.

Try it out: https://josdejong.github.io/jsonrepair/

The following issues can be fixed:

- Add missing quotes around keys
- Add missing escape characters
- Add missing commas
- Replace single quotes with double quotes
- Replace special quote characters like `“...”`  with regular double quotes
- Replace special white space characters with regular spaces
- Replace Python constants `None`, `True`, and `False` with `null`, `true`, and `false`
- Strip trailing commas
- Strip comments like `/* ... */` and `// ...`
- Strip JSONP notation like `callback({ ... })`
- Strip escape characters from an escaped string like `{\"stringified\": \"content\"}`
- Strip MongoDB data types like `NumberLong(2)` and `ISODate("2012-12-19T06:01:17.171Z")`
- Concatenate strings like `"long text" + "more text on next line"`
- Turn newline delimited JSON into a valid JSON array, for example:
    ```
    { "id": 1, "name": "John" }
    { "id": 2, "name": "Sarah" }
    ```


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


### Command Line Interface (CLI)

When `jsonrepair` is installed globally using npm, it can be used on the command line. To install `jsonrepair` globally:

```bash
$ npm install -g jsonrepair
```

Usage:

```
$ jsonrepair [filename] {OPTIONS}
```

Options:

```
--version, -v       Show application version
--help,    -h       Show help
```

Example usage:

```
$ jsonrepair broken.json                         # Repair a file, output to console
$ jsonrepair broken.json > repaired.json         # Repair a file, output to file
$ jsonrepair broken.json --overwrite             # Repair a file, replace the file itself
$ cat broken.json | jsonrepair                   # Repair data from an input stream
$ cat broken.json | jsonrepair > repaired.json   # Repair data from an input stream, output to file
```

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
