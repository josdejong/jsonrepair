# How to publish

1. In `CHANGELOG.md`:
    - Describe the changes 
    - Fill in date and
    - Fill in version number
2.  Update version number in `package.json`
3.  Run `npm install` to get the updated version also in `package-lock.json`
4.  Commit changes
    ```
    $ git add CHANGELOG.md package.json package-lock.json
    $ git commit -m "Publish v1.2.3"
    ```
5.  Merge `develop` into `main`:
    ```
    $ git checkout main
    $ git merge develop
    ```
6.  Push changes:
    ```
    git push
    ```
7.  Create version tag:
    ```
    $ git tag v1.2.3
    $ git push --tags
    ```
8.  Wait until the github build workflow finish and is green
9.  Publish on npm:
    ```
    $ npm publish
    ```
10. Checkout `develop` again
    ```
    $ git checkout develop
    ```
