const express = require('express');
const router = express.Router();
const db = require('../db');
const runjava = require('../runjava');

router.get('/', async (req, res) => { 
    const problems = await db.problems.allUser(req.session.user_id);
    
    res.render('pages/index', {user_email: req.session.user_email, problems: problems});
});

router.get('/problems/:problem_slug', async (req, res) => {
    console.log("PARAMSSGLUG " + req.params.problem_slug);
    const problem = await db.problems.slug(req.params.problem_slug);

    const testcases = await db.problems.testcases(req.params.problem_slug);


    if(!problem.problem_template || problem.problem_template === ""){
        problem.problem_template = `import java.util.Scanner;
        
public class Main {        

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        
    }
}`;
    }

    res.render('pages/problem', {problem: problem, testcases: testcases});
});

router.get('/problemset/:problemset_slug', async (req, res) => {
    const problems = await db.problems.problemset({problem_slug: req.params.problem_slug, user_id: req.session.user_id});
    
    res.render('pages/index', {user: req.session.user, problems: problems});
});


router.post('/check/:problem_slug/', async (req, res) => {
    const code = req.body.code;

    const testcases = await db.problems.testcases(req.params.problem_slug);

    const s = await runjava.check(code, testcases);


    console.log(s);
    res.send(JSON.stringify(s));
});

router.post('/submit/:problem_slug/', async (req, res) => {
    const code = req.body.code;

    const testcases = await db.problems.testcases(req.params.problem_slug);

    let ok = true;
    let s = { testcases: []};
    for (testcase of testcases){
        let result;
        try {
            result = await runjava(code, testcase.input);
        } catch(e){
            console.log("KKKKKKKKKKK KK K K");
        }
        
        if('a'+result.stdout != 'a') {
            const resultre = result.stdout.replace(/(\s+)\n/g,'').replace(/\s+$/g,'');
            if(resultre === testcase.output) {
                s.testcases.push({ result: 'ok', stdout: resultre, expected: testcase.output }); 
            } else {
                ok = false;
                s.testcases.push({ result: 'fail', expected: testcase.output, stdout: resultre });
            }
        } else {
            ok = false;
            s.testcases.push({ result: 'fail', stderr: result.stderr });            
        }
    }

    db.problems.insertSubmission({submission_code: code, user_id: req.session.user_id, problem_slug: req.params.problem_slug, submission_ok: ok});

    res.send(JSON.stringify(s));
});

router.post('/save/:problem_slug', async (req, res) => {
    const code = req.body.code;

    db.problems.saveProblem({submission_code: code, user_id: req.session.user_id, problem_slug: req.params.problem_slug, submission_ok: ok});
});

module.exports = {
    index: router,
    admin: require('./admin')
};