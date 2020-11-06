# How to publish

1. In `CHANGELOG.md`:
    - Describe the changes 
    - Fill in date and
    - Fill in version number
2. Update version number in `package.json`
3. Run `npm install` to get the updated version also in `package-lock.json`
4. Merge `develop` into `master`:
    ```
    $ git checkout master
    $ git merge develop
    ```
5. Push changes:
    ```
    git push
    ```
6. Create version tag:
    ```
    $ git tag v1.2.3
    $ git push --tags
    ```
7. Wait until the tests in [Travis CI](https://travis-ci.org/) finish and are green
8. Publish on npm:
    ```
    $ npm publish
    ```
9. Checkout `develop` again
    ```
    $ git checkout develop
    ```
