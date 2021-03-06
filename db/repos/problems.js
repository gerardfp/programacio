class ProblemsRepository {
    constructor(db, pgp) {
        this.db = db;
        this.pgp = pgp;
        this.testacasesColumnSet = new pgp.helpers.ColumnSet(['problem_id', 'testcase_input', 'testcase_output', 'testcase_explanation', 'testcase_num'], {table: 'testcases'});
    }
    
    async all() {
        return this.db.any('SELECT * FROM problems');
    }

    async allUser(user_id) {
        return this.db.any('SELECT *, (SELECT submission_ok FROM submissions WHERE submissions.problem_id = problems.problem_id AND submission_ok = TRUE AND user_id = $1 LIMIT 1) as submission_ok FROM problems', user_id);
    }

    async problemset(data) {
        return this.db.any('SELECT *, (SELECT submission_ok FROM submissions WHERE submissions.problem_id = problems.problem_id AND user_id = ${user_id} AND submission_ok = TRUE LIMIT 1) as submission_ok FROM problems JOIN problems_r_problemsets USING (problem_id) JOIN problemsets USING(problemset_id) WHERE problemsets.problemset_slug = ${problemset_slug}', data);
    }

    async slug(slug) {
        return this.db.one('SELECT * FROM problems WHERE problem_slug = $1 LIMIT 1', slug);
    }

    async testcases(slug) {
        return this.db.any('SELECT * FROM testcases JOIN problems USING(problem_id) WHERE problem_slug = $1', slug);
    }

    async saveProblem(data) {
        await this.db.none('UPDATE problems set problem_title = ${problem_title}, problem_statement = ${problem_statement}, problem_input = ${problem_input}, problem_output = ${problem_output}, problem_template = ${problem_template} WHERE problem_slug = ${problem_slug}', data)
    }

    async upsertProblem(data) {
        return this.db.one('INSERT INTO problems(problem_title, problem_statement, problem_input, problem_output, problem_template, problem_slug) VALUES(${problem_title}, ${problem_statement}, ${problem_input}, ${problem_output}, ${problem_template}, ${problem_slug}) ON CONFLICT(problem_slug) DO UPDATE set problem_title = ${problem_title}, problem_statement = ${problem_statement}, problem_input = ${problem_input}, problem_output = ${problem_output}, problem_template = ${problem_template} RETURNING problem_id', data)
    }

    async slugAvailable(slug){
        return this.db.result('SELECT problem_slug FROM problems WHERE problem_slug = $1', slug, r => r.rowCount > 0);
    }

    async deleteTestcases(data) {
        if(data.problem_id){
            this.db.none('DELETE FROM testcases WHERE problem_id = ${problem_id}', data);
        // } else if(data.problem_slug) {
        //     this.db.none('DELETE FROM testcases WHERE problem_id = (SELECT problem_id FROM problems WHERE problem_slug = ${problem_slug} LIMIT 1)', data);
        }
    }

    async insertTestcase(data){
        this.db.none('INSERT INTO testcases(problem_id, testcase_input, testcase_output, testcase_explanation, testcase_num) VALUES((SELECT problem_id FROM problems WHERE problem_slug = ${problem_slug}), ${testcase_input}, ${testcase_output}, ${testcase_explanation}, ${testcase_num})', data);
    }

    async insertSubmission(data){
        this.db.none('INSERT INTO submissions(problem_id, user_id, submission_code, submission_ok) VALUES((SELECT problem_id FROM problems WHERE problem_slug = ${problem_slug}), ${user_id}, ${submission_code}, ${submission_ok})', data);
    }

    async insertTestcases(data){
        this.db.none(this.pgp.helpers.insert(data, this.testacasesColumnSet));
    }
}


module.exports = ProblemsRepository;