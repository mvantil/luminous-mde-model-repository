var EventEmitter = require('events').EventEmitter,
	async = require('async'),
	_ = require('underscore'),
	path = require('path'),
	fs = require('fs');

function RepositoryFactory() {
	var emitter = new EventEmitter();
	var typeRepositories = [];

	var repositoryDirectory = path.join(__dirname, 'repository');
	fs.readdir(repositoryDirectory, function(err, files) {
		async.each(files, function(file, callback) {
			var repositoryClass = require(path.join(repositoryDirectory, file));
			repositoryClass.register(function(type, repository) {
				typeRepositories[type] = repository;
			}, callback);
		}, function() {
			emitter.emit('repositoriesLoaded');
			emitter.on('newListener', function(eventName, listener) {
				if (eventName == 'repositoriesLoaded') {
					listener();
				}
			});
		});
	});

	this.get = function(type, callback) {
		emitter.once('repositoriesLoaded', function() {
			var typeParts = type.split('/');
			var typeName = '';
			var repository; //set this to default
			_.each(_.rest(typeParts), function(typePart) {
				typeName += '/' + typePart;
				if (typeRepositories[typeName]) {
					repository = new typeRepositories[typeName](type);
				}
			});
			callback(repository);
		});
	};
}

module.exports = RepositoryFactory;
