# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.5.0](https://github.com/josdejong/jsonrepair/compare/v3.4.1...v3.5.0) (2023-12-07)


### Features

* create CLI option --output, and refactor the CLI a bit ([1cf15c4](https://github.com/josdejong/jsonrepair/commit/1cf15c4d37cdb1286aa2b2503d125f6a4c596a8d))
* expose options bufferSize and chunkSize ([aac8866](https://github.com/josdejong/jsonrepair/commit/aac886609f876a4704017829421e07846d04a14d))
* get NDJSON working again ([bbe44c6](https://github.com/josdejong/jsonrepair/commit/bbe44c6d64e3ebc1960aeaa48ee21b9c1fbe9d18))
* get repairing Mongo data types and JSONP working again ([dad0a1b](https://github.com/josdejong/jsonrepair/commit/dad0a1bc5143882338503806bf5964cbe9131d61))
* implement option `--buffer` in the CLI ([67591a6](https://github.com/josdejong/jsonrepair/commit/67591a6579941fc09e0fcf838ebacbd86bb534a0))
* implement streaming support (WIP) ([b1cbc8a](https://github.com/josdejong/jsonrepair/commit/b1cbc8a8e8db65d15358d5ac18cc4fc9d60afaa4))
* keep the regular and streaming implementation side by side (WIP) ([8585240](https://github.com/josdejong/jsonrepair/commit/858524010ddce062e064cebad2f2a5215506d40e))
* make the CLI streaming (WIP) ([2ac0b60](https://github.com/josdejong/jsonrepair/commit/2ac0b60f4eab6db2bf52e55eab6ca86680727c9c))
* repair a string concat that is not followed by a string ([bf57c09](https://github.com/josdejong/jsonrepair/commit/bf57c09e1a36a32ffcc3ec2850db44c161e5e8e7))
* repair many cases again (WIP) ([c09a9d7](https://github.com/josdejong/jsonrepair/commit/c09a9d758c07db86539dafdc7076e0f7cf6c9c3f))
* streaming support in Node.js ([79f7a66](https://github.com/josdejong/jsonrepair/commit/79f7a663622e2814c0297dea77a72a94704f32b9))


### Bug Fixes

* a bug in `.charCodeAt` ([d384b5a](https://github.com/josdejong/jsonrepair/commit/d384b5a7240d24357f721a55a499569d58014bef))
* broken unit tests ([23743d6](https://github.com/josdejong/jsonrepair/commit/23743d691113a0d1184b6fabe10a5214c36ce6e4))
* do not export `jsonrepairCore` ([b07f6f9](https://github.com/josdejong/jsonrepair/commit/b07f6f9da9cb0b2fe556014beefc0d02a96fdf55))
* get CLI tests working ([fd21b9c](https://github.com/josdejong/jsonrepair/commit/fd21b9cdc002f20ff0064c64c4c4cf65bb65be99))
* improved index out of range error message ([9aff9a4](https://github.com/josdejong/jsonrepair/commit/9aff9a481f514b986ecb8419b4d9140e5be5db09))
* performance improvements ([b82efb4](https://github.com/josdejong/jsonrepair/commit/b82efb4c50f0d465d295534b52b5d0dcbd97af44))
* port fixing truncated unicode chars ([7e919a2](https://github.com/josdejong/jsonrepair/commit/7e919a2c29bc37c9bf701f6683ed80d8918c623f))
* refactoring and fixes (WIP) ([4a09322](https://github.com/josdejong/jsonrepair/commit/4a09322f2534456311b5277a612b4e64abdfa4f2))
* throw an error when reading beyond the current received input ([b6ec71c](https://github.com/josdejong/jsonrepair/commit/b6ec71cfe5c47db70d20dd4d9e182f00faf47b3c))
* unit tests ([0503223](https://github.com/josdejong/jsonrepair/commit/0503223f45827521ad2b759a1e5c34528a3951b0))

### [3.4.1](https://github.com/josdejong/jsonrepair/compare/v3.4.0...v3.4.1) (2023-11-12)


### Bug Fixes

* [#109](https://github.com/josdejong/jsonrepair/issues/109) fix truncated unicode characters ([c9c8d80](https://github.com/josdejong/jsonrepair/commit/c9c8d80e6f3177442f8a0ddcb1856f206cb0459f))

## [3.4.0](https://github.com/josdejong/jsonrepair/compare/v3.3.0...v3.4.0) (2023-11-01)


### Features

* [#78](https://github.com/josdejong/jsonrepair/issues/78) repair truncated JSON ([17a002a](https://github.com/josdejong/jsonrepair/commit/17a002a55c6f0fdeb6bf064d85d4ff6b03509963))

## [3.3.0](https://github.com/josdejong/jsonrepair/compare/v3.2.4...v3.3.0) (2023-11-01)


### Features

* [#103](https://github.com/josdejong/jsonrepair/issues/103) remove redundant close brackets ([f81ffad](https://github.com/josdejong/jsonrepair/commit/f81ffad5f30fc7e3cec8f1481f8b189c6a4eb49f))

### [3.2.4](https://github.com/josdejong/jsonrepair/compare/v3.2.3...v3.2.4) (2023-10-04)


### Bug Fixes

* [#101](https://github.com/josdejong/jsonrepair/issues/101) implement a smarter way to fix both missing end quotes and unescaped newline characters ([51a4de9](https://github.com/josdejong/jsonrepair/commit/51a4de923d78d23d7fbd39be1810713a7db3eea9))

### [3.2.3](https://github.com/josdejong/jsonrepair/compare/v3.2.2...v3.2.3) (2023-09-27)


### Bug Fixes

* [#99](https://github.com/josdejong/jsonrepair/issues/99) fix repairing single quoted strings containing quotes such as backtick ([b4b9180](https://github.com/josdejong/jsonrepair/commit/b4b918017991f783d98ed376792ec97df74c678d))
* repair numeric values with trailing zeros like `00789` by changing them into a string ([399f593](https://github.com/josdejong/jsonrepair/commit/399f593d110c06172b7eddf5b7d4cc9f0cd6969e))

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
