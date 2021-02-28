const express = require('express');
const router = express.Router();
const db = require('../db');


router.get('/problems/create', async (req, res) => {

    res.render('pages/adminproblem', {problem: {}, testcases: []});
});

router.get('/problems/edit/:slug', async (req, res) => {
    const problem = await db.problems.slug(req.params.slug);

    const testcases = await db.problems.testcases(req.params.slug);

    res.render('pages/adminproblem', {problem: problem, testcases: testcases});
});

router.post('/save/', async (req, res) => {

    if(req.body.data.slug === ""){

        const slug = req.body.data.title.replace(/[^0-9a-z]/gi, '');

        var i = 0;

        var newslug = slug;
        while(!db.problems.slugAvailable(newslug)){
            i++;
            newslug = slug + i;
        }

        console.log("NEWSLUGG = " + newslug);

        req.body.data.slug = newslug;
    }

    await db.problems.insert(req.body.data);

    res.send(JSON.stringify({redirect: "/admin/problems/edit/" + req.body.data.slug}));
});

router.post('/save/:slug', async (req, res) => {
    await db.problems.save(req.body.data);

    res.send('{}');
});

router.get('/', async (req, res) => { 
    const problems = await db.problems.all();
    res.render('pages/adminindex', {user: req.session.user, problems: problems});
});

module.exports = router;