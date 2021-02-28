const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

const runjava = async (code, input) => {
  const tmpjava = path.join(__dirname,"tmpjava","random.java");
  fs.writeFileSync(tmpjava, code,{ 
    encoding: "utf8", 
    flag: "w", 
    mode: 0o666 
  });

  try {
    return await exec(`echo ${input} | java ${tmpjava}`);
  } catch(e){
    return e;
  }
}

module.exports = runjava;