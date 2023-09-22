# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.2.2](https://github.com/josdejong/jsonrepair/compare/v3.2.1...v3.2.2) (2023-09-22)


### Bug Fixes

* [#100](https://github.com/josdejong/jsonrepair/issues/100) jsonrepair sometimes crashing when repairing missing quotes (regression since v3.2.1) ([f573da2](https://github.com/josdejong/jsonrepair/commit/f573da2f0575c0434dface16fe906754dc47f124))

### [3.2.1](https://github.com/josdejong/jsonrepair/compare/v3.2.0...v3.2.1) (2023-09-20)


### Bug Fixes

* [#97](https://github.com/josdejong/jsonrepair/issues/97) improved handling of missing start and end quotes ([82df750](https://github.com/josdejong/jsonrepair/commit/82df75049ffd4aecc275bedb8f594a462027a834))
* [#98](https://github.com/josdejong/jsonrepair/issues/98) wrong position reported in the error message of invalid numbers ([5093616](https://github.com/josdejong/jsonrepair/commit/5093616f91454cafa47d482e830017781155cd79))
* throw an error on numbers with a leading zero instead of splitting them in two ([829d3ee](https://github.com/josdejong/jsonrepair/commit/829d3eebb02a1d5bbf395ba3fb7d5a4814fd1b3a))

## [3.2.0](https://github.com/josdejong/jsonrepair/compare/v3.1.0...v3.2.0) (2023-06-13)


### Features

* repair a missing object value ([2cd756f](https://github.com/josdejong/jsonrepair/commit/2cd756f7806320003551b1fea63e2495dba39080))


### Bug Fixes

* [#93](https://github.com/josdejong/jsonrepair/issues/93) repair `undefined` values by replacing them with `null` ([af348d7](https://github.com/josdejong/jsonrepair/commit/af348d723586bc06f93a510d30154bd484052165))

## [3.1.0](https://github.com/josdejong/jsonrepair/compare/v3.0.3...v3.1.0) (2023-05-04)


### Features

* fix broken numbers at the end of the string ([c42d9dd](https://github.com/josdejong/jsonrepair/commit/c42d9dd9ac6c60f2ebef8292d0485409f90d2ab9))
* fix broken numbers at the end of the string ([#91](https://github.com/josdejong/jsonrepair/issues/91)) ([9ad00fd](https://github.com/josdejong/jsonrepair/commit/9ad00fd09b600ac191bda9dec4469aa553e97645))

### [3.0.3](https://github.com/josdejong/jsonrepair/compare/v3.0.2...v3.0.3) (2023-04-17)


### Bug Fixes

* [#89](https://github.com/josdejong/jsonrepair/issues/89) wrongly parsing strings that contain a double quote left or right ([4023ece](https://github.com/josdejong/jsonrepair/commit/4023ece4442a85bc615e936fbb1de8683e821e91))

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
