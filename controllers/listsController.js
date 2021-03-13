'use strict';

const pg = require('../db/pg');
const knex = require('../db/knex');

const { listsTableFields } = require('../library/tableFields');
const {
	validateRequestBody,
	gatherTableUpdateableFields
} = require('../utilities/requestBodyUtilities');

const updateableListFields = gatherTableUpdateableFields(listsTableFields);

// @desc Get all lists
// @route Get /api/lists
// @access Private
exports.getAllLists = async (req, res, next) => {
	try {
		const userId = req.user.sub;
		const { rows } = await pg.query('SELECT * FROM lists WHERE user_id = $1', [userId]);
		res.status(200).json(rows);
	} catch (error) {
		next(error);
	}
}

// @desc Get a list
// @route Get /api/lists/:listId
// @access Private
exports.getOneList = async (req, res, next) => {
	try {
		const userId = req.user.sub;
		const { listId } = req.params;
		const { rows } = await pg.query('SELECT * FROM lists WHERE user_id = $1 AND list_id = $2', [userId, listId]);
		res.status(200).json(rows);
	} catch (error) {
		next(error);
	}
}

// @desc Create a list
// @route POST /api/lists/
// @access Private
exports.createOneList = async (req, res, next) => {
	try {
		validateRequestBody(req, listsTableFields, next);

		const userId = req.user.sub;
		const newList = { user_id: userId }

		for (const [key, value] of Object.entries(req.body)) {
			newList[key] = value;
		}

		knex
			.insert(newList)
			.into('lists')
			.returning('*')
			.then(result => {
				const results = result[0];
				res
					.status(201)
					.location(`${req.originalUrl}/${results.listId}`)
					.json(results);
			})
			.catch(error => {
				next(error);
			});
	} catch (error) {
		next(error);
	}
}

// @desc Update a list
// @route Put /api/lists/:listId
// @access Private
exports.updateList = (req, res, next) => {
	try {
		validateRequestBody(req, listsTableFields, next);

		const userId = req.user.sub;
		const { listId } = req.params;
		const toUpdate = {};

		updateableListFields.forEach((field) => {
			if (field in req.body) {
				toUpdate[field] = req.body[field];
			}
		});

		toUpdate.modified_on = new Date(Date.now()).toISOString();

		knex('lists')
			.returning('*')
			.where({
				user_id: userId,
				list_id: listId
			})
			.update(toUpdate)
			.then(results => {
				const result = results[0];
				res
					.status(200)
					.location(`${req.originalUrl}/${result.list_id}`)
					.json(result);
			})
			.catch(error => {
				next(error);
			});
	} catch (error) {
		next(error);
	}
}

// @desc Delete a list
// @route Delete /api/lists/:listId
// @access Private
exports.deleteList = async (req, res, next) => {
	try {
		const { listId } = req.params;

		// //CHECK TO MAKE SURE listId IS A NUMBER
		if (isNaN(listId)) {
			const error = new Error(`Invalid list id.`);
			error.status = 400;
			return next(error);
		}

		const { rowCount } = await pg.query('DELETE FROM lists WHERE list_id = $1', [listId]);
		if (rowCount === 1) {
			res
				.status(204)
				.json({ message: 'list deleted.' });
		} else {
			const error = new Error(
				`Could not find a list with listId: ${listId}.`
			);
			error.status = 406;
			return next(error);
		}
	} catch (error) {
		next(error);
	}
}