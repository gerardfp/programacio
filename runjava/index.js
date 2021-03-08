const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

/*
TODO: pasar-li el codi i tots els testcases a la vegada
que cree els arxius una sola vegada
Els testcases igual ja deurien estar en un fitxer previament
*/

class Checker {
    async runjava(codefile, inputfile) {
     
      try {
        const result = await exec(`cat ${inputfile} | java ${codefile}`); 
        // fs.unlink(tmpjava, () => {});
        // fs.unlink(tmptest, () => {});
        return { stdout: result.stdout };
      } catch(e){
        return { stderr: e.stderr};
      }
    
    }


    async check(code, testcases)  {
      const id = Math.floor(Math.random() * (999999999 - 1) + 1);
      const codefile = path.join(__dirname,"tmpjava",`code${id}.java`);
      fs.writeFileSync(codefile, code, { encoding: "utf8", flag: "w", mode: 0o666 });

      var s = { testcases: []};
      for (testcase of testcases){
          const testcasefile = path.join(__dirname,"tmpjava",`${testcase.problem_id}-${testcase.testcase_num}`);
          const result = await this.runjava(codefile, testcasefile);
  
          if (result.stderr){
              s.testcases.push({ result: 'fail', stderr: result.stderr });
          } else {
              const resultre = result.stdout.replace(/(\s+)\n/g,'').replace(/\s+$/g,'');
              if(resultre === testcase.testcase_output) {
                  s.testcases.push({ result: 'ok', stdout: resultre, expected: testcase.testcase_output }); 
              } else {
                  s.testcases.push({ result: 'fail', expected: testcase.testcase_output, stdout: resultre });
              }
          }
      }

      return s;

    }

    async updateTestcases(testcases) {
      for(testcase of testcases) {
        const tmptest = path.join(__dirname,"tmpjava",`${testcase.problem_id}-${testcase.testcase_num}`);
        fs.writeFileSync(`${tmptest}`, testcase.testcase_input, { encoding: "utf8", flag: "w", mode: 0o666 });
        // fs.writeFileSync(`${tmptest}-out`, testcase.testcase_input, { encoding: "utf8", flag: "w", mode: 0o666 });
      }
    }

}

module.exports = new Checker();