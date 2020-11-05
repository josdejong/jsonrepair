# simple-json-repair

Repair invalid JSON documents.

The following issues can be fixed:

- Add missing quotes around keys
- Replace single quotes with double quotes
- Turn newline delimited JSON into a valid JSON array
- Add missing escape characters
- Replace special white space characters with regular spaces
- Replace special quote characters like `“...”`  with regular double quotes
- Add missing commas
- Strip trailing commas
- Strip comments like `/* ... */` and `// ...`
- Strip JSONP notation like `callback({ ... })`
- Strip MongoDB data types like `NumberLong(2)` and `ISODate("2012-12-19T06:01:17.171Z")`
- Replace Python constants `None`, `True`, and `False` with `null`, `true`, and `false`


## Install

```
npm install simple-json-repair
```


## Use

```js
import simpleJsonRepair from 'simple-json-repair'

// The following is invalid JSON: is consists of JSON contents copied from 
// a JavaScript code base, where the keys are missing double quotes, 
// and strings are using single quotes:
const json = '{name: \'John\'}'

const repaired = simpleJsonRepair(json)
console.log(repaired) // '{"name": "John"}'
```


### API

```
simpleJsonRepair(json: string) : string
```

The function `simpleJsonRepair` throws an exception when an issue is encountered
which could not be solved. When no error is thrown, the output will be valid JSON.


## License

Released under the [ISC license](LICENSE.md).
