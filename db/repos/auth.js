class AuthRepository {
    constructor(db, pgp) {
        this.db = db;
    }
    
    async auth(email, password) {
        let res;
        try {
            res = await this.db.one("SELECT * FROM users WHERE email = $1 AND password = crypt($2, password) LIMIT 1", [email, password]);
        } catch(e){
            res = {};
        }
        return res;
    }

    async upsert(email, password) {

        try {
            if(await this.db.result('SELECT * FROM users WHERE email = $1', email, r => r.rowCount > 0 ? true : false)){
                await this.db.none("UPDATE users SET password = crypt($2, gen_salt('bf', 8)) WHERE email = $1", [email, password]);
            } else {
                await this.db.none("INSERT INTO users (email, password) VALUES($1, crypt($2, gen_salt('bf', 8)))", [email, password]);    
            }
        } catch(e){
            console.log("UPSERT AUTH NOT CATCHHHH");
            await this.db.none("INSERT INTO users (email, password) VALUES($1, crypt($2, gen_salt('bf', 8)))", [email, password]);
        }
    }
}


module.exports = AuthRepository;