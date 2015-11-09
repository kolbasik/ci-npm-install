# ci-npm-install

## command

```
$ node index.js --config=.npm-watch.json --hash=md5
```

## config

```
{
  "packages": {
    "./bower.json": {
      "hash": "",
      "command": "rm -rf bower_components && bower install"
    },
    "./package.json": {
      "hash": "",
      "command": "rm -rf node_modules && npm install"
    },
    "./LICENSE": {
      "hash": "",
      "command": "echo ${hash}:${file}"
    }
  }
}
```
