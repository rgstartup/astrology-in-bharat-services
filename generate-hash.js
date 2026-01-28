const argon2 = require('argon2');

async function generateHash() {
    const password = 'Admin@123';
    try {
        const hash = await argon2.hash(password, { type: argon2.argon2id });
        console.log('PASSWORD: ' + password);
        console.log('HASH: ' + hash);
    } catch (err) {
        console.error(err);
    }
}

generateHash();
