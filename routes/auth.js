app.post('/auth', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (username && password) {
        const n = await db.auth.auth(username, password);
        
        if(n > 0){
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/home');
        } else {
            res.send('Incorrect Username and/or Password');
        }			
        res.end();
    } else {
        res.send('Please enter Username and Password!');
        res.end();
    }
});