# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.0.2](https://github.com/josdejong/jsonrepair/compare/v3.0.1...v3.0.2) (2023-01-06)


### Bug Fixes

* error handling unicode characters containing a `9` ([d665ec2](https://github.com/josdejong/jsonrepair/commit/d665ec2f934f8d499f0498d5a1a91515ee4dbd72))

### [3.0.1](https://github.com/josdejong/jsonrepair/compare/v3.0.0...v3.0.1) (2022-12-20)


### Bug Fixes

* improve resolving unquoted strings and missing colon ([45cd4e4](https://github.com/josdejong/jsonrepair/commit/45cd4e45c6c10fac148cf6a037752586ed4fb2d5))


## 2021-12-19, version 3.0.0

- Complete rewrite of the parser in TypeScript, with improved performance.
- Can repair some additional cases of broken JSON.

⚠ BREAKING CHANGES

- Changed the API from default export `import jsonrepair from 'jsonrepair'` to named export `import { jsonrepair} from 'jsonrepair'`
- Changed in UMD export from `jsonrepair` to `JSONRepair.jsonrepair`
- Changed the error class to `JSONRepairError` with a property `.position`


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
