CREATE EXTENSION pgcrypto;

CREATE TABLE users (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, email text NOT NULL, password text NOT NULL, admin BOOLEAN);

INSERT INTO users (email, password, admin) VALUES ('admin', crypt('admin', gen_salt('bf', 8)), TRUE);

SELECT * FROM users WHERE email = lower('nick@example.com') AND password = crypt('12345', password);