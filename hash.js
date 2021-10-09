const crypto = require('crypto');

class Hash {
  constructor(key) {
    this.key = key;
    this.iv = crypto.randomBytes(16);
  }

  encrypt(text) {
    if (this.key === undefined || this.key === null || this.key === 'unknown') {
      return new Error('Provided encryption key is null');
    }
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.getKey()), this.getIv());
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: this.getIv().toString('hex'), encryptedData: encrypted.toString('hex') };
  }

  decrypt(text) {
    if (this.key === undefined || this.key === null || this.key === 'unknown') {
      return new Error('Provided encryption key is null');
    }
    try {
      const iv = Buffer.from(text.iv, 'hex');
      const encryptedText = Buffer.from(text.encryptedData, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.getKey()), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (e) {
      if (e.message.includes('EVP_DecryptFinal_ex:bad decryp')) {
        return 'Decryption failed.';
      }
    }
  }

  getKey() {
    return this.key;
  }

  getIv() {
    return this.iv;
  }
}

module.exports = Hash;
