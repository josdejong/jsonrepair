# Changelog

## 2021-06-09, version 2.2.1

- Improved handling of trailing commas.
- Improved handling of newline delimited JSON containing commas.
- Improved handling of repairing objects/arrays with missing closing bracket.


## 2021-04-01, version 2.2.0

- Implement #16: turn an escaped string containing JSON into valid JSON.


## 2021-04-01, version 2.1.0

- Implemented command line interface (CLI), see #34.


## 2021-03-01, version 2.0.1

- Performance improvements.


## 2021-01-13, version 2.0.0

- Renamed the library from `simple-json-repair` to `jsonrepair`.
  Thanks a lot @vmx for making this npm package name available!
- Change source code from TypeScript to JavaScript. Reasons: TypeScript 
  conflicts with using native ESM, requiring ugly workarounds. 
  Due to some (old) TypeScript issues we also have to use `@ts-ignore` a lot. 
  Using TypeScript makes running tests slower. And in this case, TypeScript 
  hardly adds value since we have a very simple API and function signatures.  


## 2020-11-06, version 1.1.0

- Implement support for string concatenation.
- Implement support for adding missing end brackets for objects and arrays.


## 2020-11-05, version 1.0.1

- Fixed ESM and UMD builds missing in npm package.


## 2020-11-05, version 1.0.0

- Initial release, code extracted from the library `jsoneditor`.
