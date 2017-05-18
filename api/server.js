'use strict';
const pkg    = require('./package.json');
const express = require('express');
const mysql  = require('mysql');
const datasource = require('./datasource.json');

const app = new express();
const startDate = new Date();

const poolConfig = Object.assign(datasource, {
    connectionLimit : 10
});

const pool = mysql.createPool(poolConfig);

function paginationMiddleware(req, res, next){
    let limit;
    try {
        limit = Number(req.query.limit) || 10;
    } catch(err) {
        limit = 10;
    }

    if (limit > 100) limit = 100;

    let skip;
    try {
        skip = Number(req.query.skip) || 0;
    } catch(err) {
        skip = 0;
    }

    req.limit = limit;
    req.skip = skip;
    next();
}

app.get('/', (req, res)=> {
    res.json({
        name: pkg.name,
        version: pkg.version,
        startDate,
        uptime: new Date() - startDate
    });
});

exposeCrud('tags');

exposeCrud('articles');

exposeList('articles_tags_th');

app.all('*', (req, res) => {
    res.status(404).json( {
        status: 404,
        message: 'Pagina non trovata'
    });
});

app.listen(8000, () => {
    console.log('Server in ascolto sulla porta 8000')
});

function formatResponse(req, data) {
    const { limit, skip } = req;
    return {
        count: data.length,
        skip,
        limit,
        prevSkip: skip - limit < 0? 0 : skip - limit,
        nextSkip: skip + limit,
        data
    };
}

function exposeList(tableName) {
    app.get(`/${tableName}`, paginationMiddleware, (req, res) => {
        pool.query(`SELECT * FROM ${tableName} LIMIT ${req.limit} OFFSET ${req.skip}`, (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(formatResponse(req, results));
        });
    });
}

function exposeCrud(tableName) {
    exposeList(tableName);

    app.get(`/${tableName}/:id`, (req, res) => {
        pool.query(`SELECT * FROM ${tableName} LIMIT ${req.limit} OFFSET ${req.skip}`, (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(formatResponse(req, results));
        });
    });

    app.post(`/${tableName}`, (req, res) => {
        pool.query('INSERT INTO ${tableName} SET ?', req.body, function (error, results, fields) {
            if (error) return res.status(500).json({ error: err });
            res.json(formatResponse(req, results));
        });
    });

    app.put(`/${tableName}/:id`, (req, res) => {
        pool.query('UPDATE ${tableName} SET ? WHERE id=?', [req.body, req.id], function (error, results, fields) {
            if (error) return res.status(500).json({ error: err });
            res.json(formatResponse(req, results));
        });
    });
}
