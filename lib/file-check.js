module.exports = {
    start: start
};

require('colors').setTheme(require('colors/themes/generic-logging'));

var Promise = require('bluebird');
var path = require('path');
var utils = require('./utils');

function start(configFile, hashFile, hashAlg) {
    return Promise.coroutine(function* () {
        var config = yield utils.loadJson(configFile);
        var hashes = yield utils.loadJson(hashFile);

        yield Promise.map(Object.keys(config.files),
            Promise.coroutine(function* (file) {
                try {
                    console.log(`file: ${file} found.`.info);

                    var oldHash = hashes[file];
                    var newHash = yield utils.fileHash(file, hashAlg);

                    if (newHash == null) {
                        console.log(`file: ${file} does not exist.`.warn);
                    } else {
                        console.log(`file: ${file} has old '${oldHash}' and new '${newHash}' hashes.`);
                    }

                    if (oldHash !== newHash) {
                        console.log(`file: ${file} changed.`.info);

                        var meta = config.files[file];
                        var command = (meta.command || 'echo unknown command for: ${file}:${hash}')
                            .replace('${file}', file).replace('${hash}', newHash);
                        yield utils.execCommand(command, path.dirname(file));
                        hashes[file] = newHash;

                        console.log(`file: ${file} handled.`.info);
                    }

                    return newHash;
                } catch (e) {
                    console.error(`file: ${file} ${e.toString()}`.error);
                }
            }),
            this);

        yield utils.saveJson(hashFile, hashes);
        console.log('app: hashes is saved!');
    }).call(this);
}
