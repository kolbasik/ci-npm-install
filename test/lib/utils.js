var expect = require('chai').expect;
var utils = require('./../../lib/utils');

describe('lib/utils', function() {
    describe('#loadJson()', function () {
        it('should load JSON from the file.', function () {
            return utils.loadJson('./test/.tmp/config.json')
                .then(function(json) {
                    expect(json).to.have.property('files');
                    expect(json.files).to.be.a('object');
                    expect(json.files).to.have.property('./test/.tmp/config.json');
                });
        });
        it('should return {} if file does not exist.', function () {
            return utils.loadJson('./does-not-exist.json')
                .then(function(json) {
                    expect(json).to.exist.and.to.be.empty;
                });
        });
    });

    describe('#saveJson()', function () {
        var fs = require('fs'),
            dump = '';

        beforeEach(function() {
            dump = './test/.tmp/dump_' + Date.now() + '.dump';
        });

        afterEach(function() {
            fs.unlink(dump, function (error) {
                if (error) throw error;
            });
        });

        it('should save JSON in the file.', function () {
            var expected = '{"TEST":1}';
            return utils.saveJson(dump, JSON.parse(expected))
                .then(function(actual) {
                    expect(actual).to.equal(expected);
                });
        });
    });

    describe('#fileHash()', function () {
        it('should compute the md5 hash for the file.', function () {
            return utils.fileHash('./test/.tmp/config.json', 'md5')
                .then(function(hash) {
                    expect(hash).to.equal('cf234165eba6d2054871dee3ebef2931');
                });
        });
        it('should compute the sha1 hash for the file.', function () {
            return utils.fileHash('./test/.tmp/config.json', 'sha1')
                .then(function(hash) {
                    expect(hash).to.equal('45024cd7ff84a919160544c930695ed987ef4491');
                });
        });
    });

    describe('#execCommand()', function () {
        it('should execute the valid command in the terminal and return the success code.', function () {
            return utils.execCommand('echo unit test', '.')
                .then(function(code) {
                    expect(code, 'exit code:').to.equal(0);
                });
        });
        it('should execute the invalid command in the terminal and return the failure error.', function () {
            return utils.execCommand('unknown unit test', '.')
                .catch(function(error) {
                    expect(error, 'error:').to.exist;
                    return true;
                });
        });
    });
});