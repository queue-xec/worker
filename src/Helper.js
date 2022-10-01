const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');

class Helper {
  static LocalTime(timestamp) {
    return moment(timestamp).format('DD-MM HH:mm:ss');
  }

  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static getTimestamp() {
    return Date.now();
  }

  static mesurePerf(started) {
    if (!started) return -1;
    return Helper.getTimestamp() - started;
  }

  static getSha256(file) {
    const fileBuffer = fs.readFileSync(file);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  static populateSha256OnAssets(arr) {
    for (let i = 0; i < arr.length; i += 1) {
      const file = arr[i];
      file.sha256 = Helper.getSha256(`${process.cwd()}${file.workerPath}`);
    }
    return arr;
  }
}

module.exports = {
  Helper,
};
