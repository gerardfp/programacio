const util = require('util');
const exec = util.promisify(require('child_process').exec);


const runjava = async () => {
  var ret = "mmm";
  const { stdout, stderr } = await exec("java Main.java");
  if(stdout) return stdout;

  return stderr;
}

module.exports = runjava;