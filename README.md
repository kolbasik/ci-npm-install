# ci-npm-install

## command

```
$ node index.js --config-file=./file-check.json --hash-alg=md5 --hash-file=./file-check.hash
```

## config

```
{
  "files": {
    "./bower.json": {
      "command": "rm -rf bower_components && bower install"
    },
    "./package.json": {
      "command": "rm -rf node_modules && npm install"
    },
    "./LICENSE": {
      "command": "echo ${hash}:${file}"
    }
  }
}
```
