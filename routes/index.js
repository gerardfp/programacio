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

    res.render('pages/problem', {problem: problem, testcases: testcases});
});

router.post('/submit/:slug/', async (req, res) => {
    const code = req.body.code;

    const testcases = await db.problems.testcases(req.params.slug);

    var s = [];
    for (testcase of testcases){
        const result = await runjava(code, testcase.input);
        console.log(result);
        s.push(result);
    }

    console.log(s);

    res.send(JSON.stringify(s));
});

module.exports = router;