const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

/*
TODO: pasar-li el codi i tots els testcases a la vegada
que cree els arxius una sola vegada
Els testcases igual ja deurien estar en un fitxer previament
*/
const runjava = async (code, input) => {

  const id = Math.floor(Math.random() * (999999999 - 1) + 1);

  const tmpjava = path.join(__dirname,"tmpjava",`code${id}random.java`);
  const tmptest = path.join(__dirname,"tmpjava",`test${id}.test`);

  fs.writeFileSync(tmpjava, code,{ encoding: "utf8", flag: "w", mode: 0o666 });
  fs.writeFileSync(tmptest, input,{ encoding: "utf8", flag: "w", mode: 0o666 });

  try {
    const result = await exec(`cat ${tmptest} | java ${tmpjava}`); 
    // fs.unlink(tmpjava, () => {});
    // fs.unlink(tmptest, () => {});
    return { stdout: result.stdout };
  } catch(e){
    return { stderr: e.stderr};
  }
}

module.exports = runjava;