const express = require('express');
const router = express.Router();
const db = require('../db');
const runjava = require('../runjava');


router.get('/problems/create', async (req, res) => {
    res.render('pages/adminproblem', {problem: {}, testcases: []});
});

router.get('/problems/edit/:problem_slug', async (req, res) => {
    const problem = await db.problems.slug(req.params.problem_slug);

    const testcases = await db.problems.testcases(req.params.problem_slug);

    res.render('pages/adminproblem', {problem: problem, testcases: testcases});
});

router.post('/save/:problem_slug?', async (req, res) => {

    if(!req.params.problem_slug){

        const slug = req.body.data.problem_title.replace(/[^0-9a-z]/gi, '');

        let newslug = slug;
        for(let i = 0; !db.problems.slugAvailable(newslug); i++){
            newslug = slug + i;
        }

        req.body.data.problem_slug = newslug;
    } else {
        req.body.data.problem_slug = req.params.problem_slug;
    }

    const problem = await db.problems.upsertProblem(req.body.data);

    await db.problems.deleteTestcases({problem_id: problem.problem_id}); //req.body.data.problem_slug);

    let testcases = [];
    for([index, testcase] of req.body.data.testcases.entries()){
        testcases.push({
            problem_id: problem.problem_id,
            testcase_input: testcase.input,
            testcase_output: testcase.output,
            testcase_explanation: testcase.explanation,
            testcase_num: index
        });
    }

    await db.problems.insertTestcases(testcases);
    await runjava.updateTestcases(testcases);

    res.send(JSON.stringify({redirect: "/admin/problems/edit/" + req.body.data.problem_slug}));
});


router.get('/', async (req, res) => { 
    const problems = await db.problems.all();
    res.render('pages/adminindex', {user_email: req.session.user_email, problems: problems});
});

module.exports = router;