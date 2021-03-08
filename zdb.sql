CREATE EXTENSION pgcrypto;

-- CONFIG
DROP TABLE IF EXISTS config CASCADE;
CREATE TABLE config(key text, value text);
INSERT INTO config(key, value) VALUES('smtpuser', '---@---.---');
INSERT INTO config(key, value) VALUES('smtppass', '----');


-- USERS
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (user_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_email text NOT NULL, user_password text NOT NULL, user_admin BOOLEAN);

INSERT INTO users (user_id, user_email, user_password, user_admin) VALUES ('a1aa5b60-779c-4b94-a7b7-661ff93c667c', 'admin', crypt('admin', gen_salt('bf', 8)), TRUE);
INSERT INTO users (user_id, user_email, user_password, user_admin) VALUES ('a2aa5b60-779c-4b94-a7b7-661ff93c667c', 'user', crypt('user', gen_salt('bf', 8)), FALSE);
INSERT INTO users (user_id, user_email, user_password, user_admin) VALUES ('a3aa5b60-779c-4b94-a7b7-661ff93c667c', 'user2', crypt('user', gen_salt('bf', 8)), FALSE);

-- PROBLEMS
DROP TABLE IF EXISTS problems CASCADE;
CREATE TABLE problems(problem_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, problem_slug text UNIQUE, problem_title text, problem_statement text, problem_template text, problem_input text, problem_output text);

INSERT INTO problems(problem_id, problem_slug, problem_title, problem_statement, problem_template, problem_input, problem_output) 
    VALUES('b1aa5b60-779c-4b94-a7b7-661ff93c667c', 'repeat-with-me', 'Repeat with me', 'Donada una paraula, repeteixla', null, 'Una paraula', 'La mateixa paraula');

-- TESTCASES
DROP TABLE IF EXISTS testcases CASCADE;
CREATE TABLE testcases(testcase_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, problem_id uuid, testcase_input text, testcase_output text, testcase_explanation text, testcase_num integer,
    CONSTRAINT fk_problem FOREIGN KEY(problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE
    );

INSERT INTO testcases(testcase_id, problem_id, testcase_input, testcase_output, testcase_explanation, testcase_num)
    VALUES('c1aa5b60-779c-4b94-a7b7-661ff93c667c', 'b1aa5b60-779c-4b94-a7b7-661ff93c667c', 'Paraula 1', 'Paraula 1', 'Pues eso', 1);
INSERT INTO testcases(testcase_id, problem_id, testcase_input, testcase_output, testcase_explanation, testcase_num)
    VALUES('c2aa5b60-779c-4b94-a7b7-661ff93c667c', 'b1aa5b60-779c-4b94-a7b7-661ff93c667c', 'Paraula 2', 'Paraula 2', null, 2);


-- SUBMISSIONS
DROP TABLE IF EXISTS submissions CASCADE;
CREATE TABLE submissions(submission_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, problem_id uuid, submission_code text, submission_ok boolean, 
    CONSTRAINT fk_problem FOREIGN KEY(problem_id) REFERENCES problems(problem_id) ON DELETE SET NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );


-- PROBLEMSETS
DROP TABLE IF EXISTS problemsets CASCADE;
CREATE TABLE problemsets(problemset_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, problemset_slug text, problemset_name text);

INSERT INTO problemsets(problemset_id, problemset_slug, problemset_name) VALUES('d1aa5b60-779c-4b94-a7b7-661ff93c667c', 'ex-recu', 'Exercicis recuperacio');

-- PROBLEMS_R_PROBLEMSETS
DROP TABLE IF EXISTS problems_r_problemsets CASCADE;
CREATE TABLE problems_r_problemsets(problem_id uuid, problemset_id uuid, 
    CONSTRAINT fk_problem FOREIGN KEY(problem_id) REFERENCES problems(problem_id) ON DELETE CASCADE,
    CONSTRAINT fk_problemset FOREIGN KEY(problemset_id) REFERENCES problemsets(problemset_id) ON DELETE CASCADE
    );

INSERT INTO problems_r_problemsets(problem_id, problemset_id) 
    VALUES('b1aa5b60-779c-4b94-a7b7-661ff93c667c', 'd1aa5b60-779c-4b94-a7b7-661ff93c667c');



