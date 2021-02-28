class AuthRepository {
    constructor(db, pgp) {
        this.db = db;
    }
    
    async auth(username, password) {
        return this.db.one('SELECT * FROM users WHERE email = $1 AND password = crypt($2, password)', [username, password]);
    }
}


module.exports = AuthRepository;