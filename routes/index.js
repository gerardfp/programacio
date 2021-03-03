const express = require('express');
const router = express.Router();
const db = require('../db');
const runjava = require('../runjava');

router.get('/', async (req, res) => { 
    const problems = await db.problems.all();
    res.render('pages/index', {user: req.session.user, problems: problems});
});

router.get('/problems/:slug', async (req, res) => {
    const problem = await db.problems.slug(req.params.slug);

    const testcases = await db.problems.testcases(req.params.slug);


    if(!problem.template || problem.template === ""){
        problem.template = `import java.io.*;
import java.util.Scanner;
        
public class Main {        
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        
    }
}`;
    }

    res.render('pages/problem', {problem: problem, testcases: testcases});
});

router.post('/submit/:slug/', async (req, res) => {
    const code = req.body.code;

    const testcases = await db.problems.testcases(req.params.slug);

    var s = { testcases: []};
    for (testcase of testcases){
        const result = await runjava(code, testcase.input);
        console.log(result);
        
        if (result.stderr) {
            s.testcases.push({ stderr: result.stderr });
        } else {
            const resultre = result.stdout.replace(/(\s+)\n/g,'').replace(/\s+$/g,'');
            if(resultre === testcase.output) {
                s.testcases.push({ result: 'ok', stdout: resultre }); 
            } else {
                s.testcases.push({ result: 'fail', expected: testcase.output, stdout: resultre });
            }
        }
    }

    res.send(JSON.stringify(s));
});

module.exports = {
    index: router,
    admin: require('./admin')
};