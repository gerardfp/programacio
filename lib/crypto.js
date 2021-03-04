const crypto = require('crypto')

class Crypto {
    constructor(){
        this.ALGORITHM_NAME = "aes-128-gcm";
        this.ALGORITHM_NONCE_SIZE = 12;
        this.ALGORITHM_TAG_SIZE = 16;
        this.ALGORITHM_KEY_SIZE = 16;
        this.PBKDF2_NAME = "sha256";
        this.PBKDF2_SALT_SIZE = 16;
        this.PBKDF2_ITERATIONS = 32767;
    }

    encryptString(plaintext, password) {
        // Generate a 128-bit salt using a CSPRNG.
        let salt = crypto.randomBytes(this.PBKDF2_SALT_SIZE);

        // Derive a key using PBKDF2.
        let key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, this.PBKDF2_ITERATIONS, this.ALGORITHM_KEY_SIZE, this.PBKDF2_NAME);

        // Encrypt and prepend salt.
        let ciphertextAndNonceAndSalt = Buffer.concat([ salt, this.encrypt(Buffer.from(plaintext, "utf8"), key) ]);

        // Return as base64 string.
        return ciphertextAndNonceAndSalt.toString("base64");
    }

    decryptString(base64CiphertextAndNonceAndSalt, password) {
        // Decode the base64.
        let ciphertextAndNonceAndSalt = Buffer.from(base64CiphertextAndNonceAndSalt, "base64");

        // Create buffers of salt and ciphertextAndNonce.
        let salt = ciphertextAndNonceAndSalt.slice(0, this.PBKDF2_SALT_SIZE);
        let ciphertextAndNonce = ciphertextAndNonceAndSalt.slice(this.PBKDF2_SALT_SIZE);

        // Derive the key using PBKDF2.
        let key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, this.PBKDF2_ITERATIONS, this.ALGORITHM_KEY_SIZE, this.PBKDF2_NAME);

        let dec;
        try {
            dec = this.decrypt(ciphertextAndNonce, key).toString("utf8"); 
        } catch(e){
            console.log("THROWWW ");
            console.log(e);
            throw e;
        }
        // Decrypt and return result.
        return dec; //this.decrypt(ciphertextAndNonce, key).toString("utf8");
    }

    encrypt(plaintext, key) {
        // Generate a 96-bit nonce using a CSPRNG.
        let nonce = crypto.randomBytes(this.ALGORITHM_NONCE_SIZE);

        // Create the cipher instance.
        let cipher = crypto.createCipheriv(this.ALGORITHM_NAME, key, nonce);

        // Encrypt and prepend nonce.
        let ciphertext = Buffer.concat([ cipher.update(plaintext), cipher.final() ]);

        return Buffer.concat([ nonce, ciphertext, cipher.getAuthTag() ]);
    }

    decrypt(ciphertextAndNonce, key) {
        // Create buffers of nonce, ciphertext and tag.
        let nonce = ciphertextAndNonce.slice(0, this.ALGORITHM_NONCE_SIZE);
        let ciphertext = ciphertextAndNonce.slice(this.ALGORITHM_NONCE_SIZE, ciphertextAndNonce.length - this.ALGORITHM_TAG_SIZE);
        let tag = ciphertextAndNonce.slice(ciphertext.length + this.ALGORITHM_NONCE_SIZE);

        // Create the cipher instance.
        let cipher = crypto.createDecipheriv(this.ALGORITHM_NAME, key, nonce);

        // Decrypt and return result.
        cipher.setAuthTag(tag);
        return Buffer.concat([ cipher.update(ciphertext), cipher.final() ]);
    }
}

module.exports = new Crypto();