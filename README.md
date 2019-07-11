# HumanID API

HumanID API server. API doc and demo https://humanid.herokuapp.com

## Prerequisites

1. Node.js >= 10 LTS
2. RDBMS (MySQL >= 14.14 or SQLite3 >= 3.22)

## Setup

1. Install `nodejs >= 10.x.x`
2. Clone repo & install dependencies `npm i`
3. Run test `npm test`
4. Generate doc `npm run doc`
   
## Configuration

App configuration is read from `config.json`. You can reuse the provided example in `config.json.example`. For `DATABASE` configuration please refer to [Sequelize configuration](http://docs.sequelizejs.com/manual/getting-started). Some common examples:

> Sqlite3 file storage

```
"DATABASE": {
    "username": "root",
    "password": null,
    "database": "humanid",
    "dialect": "sqlite",
    "storage": "db.sqlite"
}
```

> MySQL with connection pooling

```
"DATABASE": {
    "username": "root",
    "password": "root",
    "database": "humanid",
    "dialect": "mysql",
    "pool": {
        "max": 5,
        "min": 0,
        "acquire": 30000,
        "idle": 10000
    }    
}
```

## Class/Entity Relationship Diagram

The API server stores data in given structure:

> `SequelizeMeta` is just ORM migration metadata which is not related to business process

![Class/Entity Relationship Diagram](erd.png)
