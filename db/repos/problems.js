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

    async save(data) {
        await this.db.none('UPDATE problems set title = ${title}, statement = ${statement}, template = ${template} WHERE slug = ${slug}', data)
    }

    async insert(data) {
        await this.db.none('INSERT INTO problems(title, statement, template, slug) VALUES(${title}, ${statement}, ${template}, ${slug})', data)
    }

    async slugAvailable(slug){
        return this.db.result('SELECT slug FROM problems WHERE slug = $1', slug, r => r.rowCount > 0);
    }
}


module.exports = ProblemsRepository;