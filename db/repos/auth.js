class AuthRepository {
    constructor(db, pgp) {
        this.db = db;
    }
    
    async auth(email, password) {
        let res;
        try {
            res = await this.db.one("SELECT * FROM users WHERE user_email = $1 AND user_password = crypt($2, user_password) LIMIT 1", [email, password]);
        } catch(e){
            res = {};
        }
        return res;
    }

    async upsert(email, password) {

        try {
            if(await this.db.result('SELECT * FROM users WHERE user_email = $1', email, r => r.rowCount > 0 ? true : false)){
                await this.db.none("UPDATE users SET user_password = crypt($2, gen_salt('bf', 8)) WHERE user_email = $1", [email, password]);
            } else {
                await this.db.none("INSERT INTO users (user_email, user_password) VALUES($1, crypt($2, gen_salt('bf', 8)))", [email, password]);    
            }
        } catch(e){
            console.log("UPSERT AUTH NOT CATCHHHH");
            await this.db.none("INSERT INTO users (user_email, user_password) VALUES($1, crypt($2, gen_salt('bf', 8)))", [email, password]);
        }
    }
}


module.exports = AuthRepository;