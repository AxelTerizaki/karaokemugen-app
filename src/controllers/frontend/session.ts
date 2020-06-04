import { Router } from 'express';

import { check } from '../../lib/utils/validators';
import { addSession, editSession, exportSession,getSessions, mergeSessions, removeSession, setActiveSession } from '../../services/session';
import { APIMessage,errMessage } from '../common';
import { requireAdmin, requireAuth, requireValidUser,updateUserLoginTime } from '../middlewares/auth';

export default function sessionController(router: Router) {
	router.route('/sessions')
	/**
 * @api {get} /sessions List karaoke sessions (by date)
 * @apiName GetSessions
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiSuccess {String} sessions/[]/seid Session UUID
 * @apiSuccess {String} sessions/[]/name Session name
 * @apiSuccess {String} sessions/[]/started_at Session starting date
 * @apiSuccess {Boolean} sessions/[]/private Is session private or public (stats will be sent to KM Server)
 * @apiSuccess {Boolean} sessions/[]/active Is session the current one?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "sessions": [
 * 		{
 * 			"name": "Jonetsu IV Day 1",
 * 			"seid": "..."
 * 			"started_at": "Sat 13 Oct 2019 09:30:00"
 * 		},
 * 		...
 * 	]
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_LIST_ERROR"}
 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (_req, res) => {
			try {
				const sessions = await getSessions();
				res.json(sessions);
			} catch(err) {
				const code = 'SESSION_LIST_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		})
	/**
 * @api {post} /sessions Create karaoke session
 * @apiName CreateSession
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} name Session name
 * @apiParam {String} [date] Optional. Date in ISO format for session. If not provided, session starts now.
 * @apiParam {Boolean} [private] Optional. Is the session private or public ? Default to false.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_CREATED"}
 * @apiError SESSION_CREATION_ERROR Error creating session
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_CREATION_ERROR"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 400 Validation error
 */
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await addSession(req.body.name, req.body.date, req.body.activate, req.body.private);
					res.status(200).json(APIMessage('SESSION_CREATED'));
				} catch(err) {
					const code = 'SESSION_CREATION_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});
	router.route('/sessions/merge')
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			const validationErrors = check(req.body, {
				seid1: {uuidArrayValidator: true},
				seid2: {uuidArrayValidator: true}
			});
			if (!validationErrors) {
				try {
					await mergeSessions(req.body.seid1, req.body.seid2);
					res.status(200).json(APIMessage('SESSION_MERGED'));
				} catch(err) {
					const code = 'SESSION_MERGE_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
			// Errors detected
			// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		});

	router.route('/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})')
	/**
 * @api {put} /sessions/:seid Edit session
 * @apiName EditSession
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiParam {String} name Name of session
 * @apiParam {boolean} [private] Is session private or public? Private sessions are not uploaded to KM Server
 * @apiParam {Date} started_at Session start time
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_EDITED"};
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_EDIT_ERROR"}
 */
		.put(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			//Validate form data
			const validationErrors = check(req.body, {
				name: {presence: {allowEmpty: false}}
			});
			if (!validationErrors) {
				// No errors detected
				try {
					await editSession(req.params.seid, req.body.name, req.body.started_at, req.body.private);
					res.status(200).json(APIMessage('SESSION_EDITED'));
				} catch(err) {
					const code = 'SESSION_EDIT_ERROR';
					errMessage(code, err);
					res.status(500).json(APIMessage(code));
				}
			} else {
				// Errors detected
				// Sending BAD REQUEST HTTP code and error object.
				res.status(400).json(validationErrors);
			}
		})
	/**
 * @api {post} /sessions/:seid Activate session
 * @apiName SetSession
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_ACTIVATED"}
 */
		.post(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, (req, res) => {
			setActiveSession(req.params.seid);
			res.status(200).json(APIMessage('SESSION_ACTIVATED'));
		})
	/**
 * @api {delete} /sessions/:seid Delete session
 * @apiName DeleteSession
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_DELETED"}
 */
		.delete(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req, res) => {
			try {
				await removeSession(req.params.seid);
				res.status(200).json(APIMessage('SESSION_DELETED'));
			} catch(err) {
				const code = 'SESSION_DELETE_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
	router.route('/sessions/:seid([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/export')
	/**
 * @api {get} /sessions/:seid/export Export session to CSV file
 * @apiName exportSession
 * @apiVersion 3.1.0
 * @apiGroup Sessions
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} seid Session ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {code: "SESSION_EXPORTED"}
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {code: "SESSION_EXPORT_ERROR"}
 */
		.get(requireAuth, requireValidUser, updateUserLoginTime, requireAdmin, async (req,res) => {
			try {
				await exportSession(req.params.seid);
				res.status(200).json(APIMessage('SESSION_EXPORTED'));
			} catch(err) {
				const code = 'SESSION_EXPORT_ERROR';
				errMessage(code, err);
				res.status(500).json(APIMessage(code));
			}
		});
}
