const assert = require('assert');
const supertest = require('supertest');
const request = supertest('http://localhost:1339');
const fs = require('fs');
const path = require('path');
const password = 'gurdil';



describe('GET /api/v1/public/', function() {
	it('should return Hello World', function(done) {
		request
			.get('/api/v1/public/')
			.set('Accept', 'application/json')
			.expect('Content-Type', 'text/html; charset=utf-8')
			.expect(200, done);
	});
});

describe('GET /api/v1/public/karas?filter=Dragon', function() {
	it('should return Dragon Ball as first karaoke song', function() {
		return request
			.get('/api/v1/public/karas?filter=Dragon')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body[0].NORM_serie, 'Dragon Ball');
			});
	});
});

describe('GET /api/v1/admin/playlists', function() {
	it('should return 2 or more playlists', function() {
		return request
			.get('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				var result = false;
				if (response.body.length >= 2) result = true;
				assert.equal(result, true);								
			});
	});
});


describe('POST / DELETE / PUT /api/v1/admin/playlists ', function() {
	var playlist = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':false,
		'flag_current':false
	};
	var playlist_current = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':false,
		'flag_current':true
	};
	var playlist_public = {
		'name':'new_playlist',
		'flag_visible':true,
		'flag_public':true,
		'flag_current':false
	};
	var new_playlist_id;
	var new_playlist_current_id;
	var new_playlist_public_id;
	it('POST a new playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_id = response.body;
			});
	});
	it('POST a new CURRENT playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist_current)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_current_id = response.body;
			});
	});
	it('POST a new PUBLIC playlist', function() {
		return request
			.post('/api/v1/admin/playlists')
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist_public)
			.expect('Content-Type', /json/)
			.expect(201)
			.then(function(response) {
				new_playlist_public_id = response.body;
			});
	});
	
	it('PUT (edit) a playlist', function() {
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist '+new_playlist_id+' updated')
			});
	});
	it('PUT (edit) a CURRENT playlist', function() {
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_current_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist '+new_playlist_current_id+' updated')
			});
	});
	it('PUT (edit) a PUBLIC playlist', function() {
		return request
			.put('/api/v1/admin/playlists/'+new_playlist_public_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.send(playlist)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {
				assert.equal(response.body,'Playlist '+new_playlist_public_id+' updated')
			});
	});
	it('DELETE a playlist ', function() {
		return request
			.delete('/api/v1/admin/playlists/'+new_playlist_id)
			.set('Accept', 'application/json')
			.auth('admin', password)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(function(response) {				
				assert.equal(response.body, 'Deleted '+new_playlist_id)
			});
	});
});