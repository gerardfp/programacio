const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/problems/create', async (req, res) => {

    res.render('pages/adminproblem', {problem: {}, testcases: []});
});

router.get('/problems/edit/:problem_slug', async (req, res) => {
    const problem = await db.problems.slug(req.params.problem_slug);

    const testcases = await db.problems.testcases(req.params.problem_slug);

    res.render('pages/adminproblem', {problem: problem, testcases: testcases});
});

router.post('/save/', async (req, res) => {

    if(req.body.data.problem_slug === ""){

        const slug = req.body.data.problem_title.replace(/[^0-9a-z]/gi, '');

        var i = 0;

        var newslug = slug;
        while(!db.problems.slugAvailable(newslug)){
            i++;
            newslug = slug + i;
        }

        console.log("NEWSLUGG = " + newslug);

        req.body.data.problem_slug = newslug;
    }

    await db.problems.insert(req.body.data);

    res.send(JSON.stringify({redirect: "/admin/problems/edit/" + req.body.data.problem_slug}));
});

router.post('/save/:problem_slug', async (req, res) => {
    await db.problems.save(req.body.data);

    res.send('{}');
});

router.get('/', async (req, res) => { 
    const problems = await db.problems.all();
    res.render('pages/adminindex', {user_email: req.session.user_email, problems: problems});
});

module.exports = router;