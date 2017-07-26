CREATE DATABASE trackimo;

\c trackimo

CREATE EXTENSION pgcrypto;

CREATE TYPE email_status AS ENUM (
  'Opened', 
  'Bounced', 
  'Clicked', 
  'DNO', 
  'Unsubscribed', 
  'Complained'
  );

CREATE TYPE role_type AS ENUM (
    'Admin',
    'Staff',
    'Checker'
);

CREATE TYPE sched_status AS ENUM (
    'Ongoing',
    'Done',
    'Upcoming'

);

CREATE TABLE users (
user_id            serial        PRIMARY KEY NOT NULL,
first_name         text        NOT NULL,
middle_init        character(1),
last_name          text        NOT NULL,
username           text        UNIQUE NOT NULL,
password           text        NOT NULL,
role               role_type
);

INSERT INTO users (first_name, middle_init, last_name, username, password, role, prof_pic) VALUES ('Sophia', '', 'Erasmo', 'sophia.utech', crypt('123456789', gen_salt('md5')), 'Admin', 'assets/images/avatar7.png');
INSERT INTO users (first_name, middle_init, last_name, username, password, role, prof_pic) VALUES ('Ami', '', 'Shafrir', 'ami.utech', crypt('utechami', gen_salt('md5')), 'Checker', 'assets/images/stanlee.jpg');
CREATE TABLE category(
category_id        serial      PRIMARY KEY NOT NULL,
category_name      text        UNIQUE NOT NULL
);

CREATE TABLE niche(
category_id       integer      NOT NULL REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
niche_id          serial       PRIMARY KEY NOT NULL,
niche_name        text         UNIQUE NOT NULL
);

CREATE TABLE email_users(
email_id         serial        UNIQUE PRIMARY KEY NOT NULL,
email_address    text,          
category_id      integer       REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
niche_id         integer       REFERENCES niche (niche_id) ON DELETE CASCADE ON UPDATE CASCADE,
company          text,
contact_person   text,
website          text          NOT NULL,
phone_number     text,
address          text,
timezone         text,
date_added       date, 
staff_assigned   text          REFERENCES users (username) ON DELETE CASCADE ON UPDATE CASCADE,
contact_url      text
);

 CREATE INDEX idx_email ON email_users(left(email_address,10000));
ALTER TABLE email_users ADD CONSTRAINT unique_email UNIQUE (email_address);

CREATE TABLE dummy_email(
email_id         serial        UNIQUE PRIMARY KEY NOT NULL,      
email_address    text,
category_id      integer,      
niche_id         integer, 
company          text,
contact_person   text,
website          text          NOT NULL,
phone_number     text,
address          text,
timezone         text,
date_added       date, 
staff_assigned   text,          
contact_url      text
);

CREATE TABLE activity(
email_address    text          REFERENCES email_users (email_address) ON DELETE CASCADE ON UPDATE CASCADE,
category_id     integer        REFERENCES category (category_id) ON DELETE CASCADE ON UPDATE CASCADE,
niche_id        integer        REFERENCES niche (niche_id) ON DELETE CASCADE ON UPDATE CASCADE,
email_status    email_status,
campaign_date   date           
);

CREATE TABLE dummy_activity(
email_address   text           PRIMARY KEY,
category_id     integer,
niche_id        integer,
email_status    email_status,
campaign_date   date           
);



CREATE TABLE dummy_activity_second(
email_address   text           PRIMARY KEY,
category_id     integer,
niche_id        integer,
email_status    email_status,
campaign_date   date           
);

CREATE TABLE advertisers(
id              serial         PRIMARY KEY NOT NULL,
company_name    text,
website         text           NOT NULL,
social_media    text,
email_address   text           NOT NULL,
remarks         varchar(1000),
phone_number    text,
contact_person  text
);

CREATE TABLE affiliates(
id              serial         PRIMARY KEY NOT NULL,
company_name    text,
website         text           NOT NULL,
social_media    text,
email_address   text           NOT NULL,
remarks         varchar(1000),
phone_number    text,
contact_person  text
);

CREATE TABLE dummyMonthlyReport (
  status text,
  percentage smallInt,
  date date
);

CREATE TABLE dummyReport (
  status text,
  percentage smallInt
);

CREATE TABLE schedule(
id      serial PRIMARY KEY NOT NULL,
start   date   NOT NULL,
category text   NOT NULL,
niche text NOT NULL
);

CREATE TABLE transaction_log(
id serial PRIMARY KEY NOT NULL,
title text NOT NULL,
actor text NOT NULL,
date_added date not null,
time_added time NOT NULL
);

CREATE VIEW viewMonthlyReport AS 
  SELECT status,
    EXTRACT(MONTH from date) as Month,
    EXTRACT(YEAR from date) as Year,
    AVG(percentage) as Average
    FROM dummyMonthlyReport 
    GROUP BY status, Month, Year 
    ORDER BY 1,2;

CREATE VIEW niche_view AS
select category_name, niche.category_id, niche_name, niche.niche_id, count(email_id) AS count FROM category, niche LEFT JOIN email_users on email_users.niche_id = niche.niche_id WHERE category.category_id = niche.category_id GROUP BY niche.category_id, niche_name, category_name, niche.niche_id ORDER BY niche_name;

CREATE VIEW category_view AS
select category.category_id, category_name, count(niche_name) as count FROM category LEFT JOIN niche ON niche.category_id = category.category_id GROUP BY category.category_id ORDER BY category_name;

CREATE VIEW report AS 
  SELECT  email_users.email_id, 
          email_users.email_address, 
          ( SELECT SUBSTRING(website FROM 'http://([^/]*).*') as domain),
          category.category_name, niche.niche_name, 
          email_status, 
          (SELECT age(activity.campaign_date) AS days) AS days 
  FROM email_users, activity, category, niche 
  WHERE activity.email_address=email_users.email_address AND 
        email_users.category_id = category.category_id AND 
        niche.niche_id=activity.niche_id;

CREATE OR REPLACE FUNCTION insert_update_username()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM users
           WHERE (username)
           = (NEW.username)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_username
BEFORE INSERT OR UPDATE OF username 
ON users
FOR EACH ROW EXECUTE PROCEDURE insert_update_username();


CREATE OR REPLACE FUNCTION insert_update_category()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM category
           WHERE (category_name)
           = (NEW.category_name)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_category
BEFORE INSERT OR UPDATE OF category_name 
ON category
FOR EACH ROW EXECUTE PROCEDURE insert_update_category();


CREATE OR REPLACE FUNCTION insert_update_niche()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM niche
           WHERE (niche_name)
           = (NEW.niche_name)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_niche
BEFORE INSERT OR UPDATE OF niche_name 
ON niche
FOR EACH ROW EXECUTE PROCEDURE insert_update_niche();


CREATE OR REPLACE FUNCTION insert_update_email()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM dummy_email
           WHERE (email_address)
           = (NEW.email_address) AND NEW.email_address != 'NULL') THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_email
BEFORE INSERT OR UPDATE OF email_address 
ON dummy_email
FOR EACH ROW EXECUTE PROCEDURE insert_update_email();



CREATE OR REPLACE FUNCTION insert_update_activity()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM activity
           WHERE (email_address)
           = (NEW.email_address) AND NEW.email_address != 'NULL') THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_activity
BEFORE INSERT OR UPDATE OF email_address 
ON activity
FOR EACH ROW EXECUTE PROCEDURE insert_update_activity();



CREATE OR REPLACE FUNCTION insert_update_email_repeat()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM email_users
           WHERE (email_address)
           = (NEW.email_address) AND NEW.email_address != 'NULL') THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_email_repeat
BEFORE INSERT OR UPDATE OF email_address 
ON email_users
FOR EACH ROW EXECUTE PROCEDURE insert_update_email_repeat();


CREATE OR REPLACE FUNCTION insert_update_advertisers()
  RETURNS trigger AS
$func$
BEGIN

IF EXISTS (SELECT 1 FROM advertisers
           WHERE (email_address)
           = (NEW.email_address)) THEN
   RETURN NULL;
END IF;

RETURN NEW;

END
$func$  LANGUAGE plpgsql;

CREATE TRIGGER before_insert_update_advertisers
BEFORE INSERT OR UPDATE OF email_address 
ON advertisers
FOR EACH ROW EXECUTE PROCEDURE insert_update_advertisers();


CREATE OR REPLACE FUNCTION loaddataCategory(filepathname text)
  RETURNS void AS
$$
BEGIN

EXECUTE format ('
COPY category(
      category_name)
FROM %L
(FORMAT CSV, HEADER)', $1);

END
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION loaddataLeads(filepathname text)
  RETURNS void AS
$$
BEGIN

EXECUTE format ('
COPY dummy_email(email_address, company, contact_person, website, phone_number, address, timezone, contact_url)
FROM %L
(FORMAT CSV, HEADER)', $1);


END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION loaddataReport(filepathname text)
  RETURNS void AS
$$
BEGIN

EXECUTE format ('
COPY dummy_activity_second(email_address)
FROM %L
(FORMAT CSV, HEADER)', $1);


END
$$ LANGUAGE plpgsql;

CREATE VIEW records as SELECT username, date_added, count(email_address) FROM users LEFT JOIN email_users on staff_assigned = username WHERE role = 'Admin' OR role = 'Staff' GROUP BY date_added, username ORDER BY date_added, username;

ALTER TABLE users
ADD prof_pic text;

CREATE VIEW viewmonthlyreport AS 
SELECT date_trunc('month', campaign_date) aS Date,  
    EXTRACT(MONTH from campaign_date) as Month,
    sum((email_status = 'Bounced')::int) as Bounced,
    sum((email_status = 'Clicked')::int) as Clicked,
    sum((email_status = 'Unsubscribed')::int) as Unsubscribed,
    sum((email_status = 'Opened')::int) as Opened,
    sum((email_status = 'DNO')::int) as DNO,
    sum((email_status = 'Complained')::int) as Complained
FROM activity WHERE campaign_date IS NOT NULL
GROUP BY Date, Month
ORDER BY Date DESC;

CREATE VIEW viewdailyreport AS 
SELECT campaign_date,
    EXTRACT(MONTH from campaign_date) as Month,
    EXTRACT(DAY from campaign_date) as Day,
    activity.category_id,
    niche_name,
    sum((email_status = 'Bounced')::int) as Bounced,
    sum((email_status = 'Clicked')::int) as Clicked,
    sum((email_status = 'Unsubscribed')::int) as Unsubscribed,
    sum((email_status = 'Opened')::int) as Opened,
    sum((email_status = 'DNO')::int) as DNO,
    sum((email_status = 'Complained')::int) as Complained
FROM activity, niche WHERE activity.niche_id = niche.niche_id AND campaign_date IS NOT NULL
GROUP BY campaign_date, Month, Day, activity.category_id, niche_name
ORDER BY campaign_date DESC;