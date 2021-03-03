const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

const runjava = async (code, input) => {
  const tmpjava = path.join(__dirname,"tmpjava","random.java");
  const tmptest = path.join(__dirname,"tmpjava","random.test");

  fs.writeFileSync(tmpjava, code,{ encoding: "utf8", flag: "w", mode: 0o666 });
  fs.writeFileSync(tmptest, input,{ encoding: "utf8", flag: "w", mode: 0o666 });

  try {
    return await exec(`cat ${tmptest} | java ${tmpjava}`);
  } catch(e){
    return e;
  }
}

module.exports = runjava;