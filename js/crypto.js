function Crypto() {
    const crypto = require('crypto');
    var passPhrase = 'TheRabbitIsWhite!';
    var intEnc = 'hex';

    return {
        setPassPhrase : function (passphrase) {  this.passPhrase = passphrase; return this; },
        encrypt       : function(data) {
            const cipher  = crypto.createCipher('aes192', passPhrase);
            let encrypted = cipher.update(data,'utf8',intEnc);
            encrypted += cipher.final(intEnc);
            return (new Buffer(encrypted, intEnc)).toString('base64');
        },
        decrypt      : function(data) {
            const decipher  = crypto.createDecipher('aes192', passPhrase);
            let decrypted = decipher.update((new Buffer(data, 'base64')).toString(intEnc),intEnc,'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
    };
};

module.exports = Crypto();
