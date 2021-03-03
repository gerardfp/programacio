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
        return this.db.one('INSERT INTO problems(title, statement, inputformat, outputformat, constraints, template, slug) VALUES(${title}, ${statement}, ${inputformat}, ${outputformat}, ${constraints}, ${template}, ${slug}) RETURNING problem_id', data)
    }

    async slugAvailable(slug){
        return this.db.result('SELECT slug FROM problems WHERE slug = $1', slug, r => r.rowCount > 0);
    }

    async insertTestcase(data){
        this.db.none('INSERT INTO testcases(problem_id, input, output, explanation) VALUES(${problem_id}, ${input}, ${output}, ${explanation})', data);
    }
}


module.exports = ProblemsRepository;