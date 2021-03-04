class ConfigRepository {
    constructor(db, pgp) {
        this.db = db;
    }
    
    async getSMTP() {
        const result = await this.db.result("SELECT * FROM config  WHERE key='smtpuser' OR key='smtppass'");
        
        var res = {};
        for(const row of result.rows) {
            res[row.key] = row.value
        }
            
        return res;
    }
}


module.exports = ConfigRepository;