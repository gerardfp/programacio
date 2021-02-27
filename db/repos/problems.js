class ProblemsRepository {
    constructor(db, pgp) {
        this.db = db;
    }
    
    async all() {
        return this.db.any('SELECT * FROM problems');
    }

    async slug(slug) {
        return this.db.one('SELECT * FROM problems WHERE slug = $1', slug);
    }

    async testcases(slug) {
        return this.db.any('SELECT * FROM testcases WHERE problem_id = (SELECT problem_id FROM problems WHERE slug = $1)', slug);
    }

}


module.exports = ProblemsRepository;