var expect = require('chai').expect;
var fc = require('./../../lib/file-check');

describe('lib/file-check', function() {
    var fs = require('fs'),
        utils = require('./../../lib/utils');

    describe('#start()', function () {
        var configFile = './test/.tmp/config.json';
        var hashFile = './test/.tmp/dump_' + Date.now() + '.hash';

        afterEach(function() {
            fs.unlink(hashFile, function (error) {
                if (error) throw error;
            });
        });

        it('should create a file with the hash values inside.', function () {
            return fc.start(configFile, hashFile, 'sha1')
                .then(function() {
                    return utils.loadJson(hashFile)
                        .then(function(hash){
                            var file = './test/.tmp/config.json';
                            expect(hash).to.have.property(file);
                            expect(hash[file]).to.equal('45024cd7ff84a919160544c930695ed987ef4491');
                        })
                });
        });
    });
});