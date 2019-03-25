const Crypto    = require('./crypto');
module.exports = {
    host: "127.0.0.1",
//host: "192.168.1.60",
    user: "root",
    password: Crypto.decrypt('cbeTdkAt4df8DH80FgIg5Q=='),
//    password: 'ocfu',
    database: 'shopdb'
}

console.log(Crypto.decrypt('cbeTdkAt4df8DH80FgIg5Q=='))
