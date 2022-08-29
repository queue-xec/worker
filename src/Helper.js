const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');

class Helper {
  static LocalTime(timestamp) {
    return moment(timestamp).format('DD-MM HH:mm:ss');
  }

  static getSha256(file) {
    const fileBuffer = fs.readFileSync(file);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  static populateSha256OnAssets(arr) {
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      file.sha256 = Helper.getSha256(`${process.cwd()}${file.workerPath}`);
    }
    return arr;
  }
}

module.exports = {
  Helper,
};
