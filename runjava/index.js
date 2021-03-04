const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

const runjava = async (code, input) => {

  const id = Math.floor(Math.random() * (999999999 - 1) + 1);

  const tmpjava = path.join(__dirname,"tmpjava",`code${id}random.java`);
  const tmptest = path.join(__dirname,"tmpjava",`test${id}.test`);

  fs.writeFileSync(tmpjava, code,{ encoding: "utf8", flag: "w", mode: 0o666 });
  fs.writeFileSync(tmptest, input,{ encoding: "utf8", flag: "w", mode: 0o666 });

  try {
    // console.log("running:  " + `cat ${tmptest} | java ${tmpjava}`);
    const result = await exec(`cat ${tmptest} | java ${tmpjava}`); 
    // fs.unlink(tmpjava, () => {});
    // fs.unlink(tmptest, () => {});
    return result;
  } catch(e){
    return e;
  }
}

module.exports = runjava;