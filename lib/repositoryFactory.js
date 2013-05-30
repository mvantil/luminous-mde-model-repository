var EventEmitter = require('futureeventemitter'),
	async = require('async'),
	_ = require('underscore'),
	path = require('path'),
	ObjectRepository = require('./repository/objectRepository'),
	fs = require('fs'),
    config = require('luminous-server-config');

var repositoryConfig = config.load().repository;

function RepositoryFactory() {
	var emitter = new EventEmitter();
	var typeRepositories = [];

	function readDirectory(directories) {
		async.map(directories, function(directory, callback) {
			fs.readdir(directory, function(err, files) {
				if (err) return callback(err);

				files = _.map(files, function(file) {
					return path.join(directory, file);
				});
				return callback(null, files);
			});
		}, function(err, files) {
			files = _.flatten(files);
			async.each(files, function(file, callback) {
				var repositoryClass = require(file);
				repositoryClass.register(function(type, repository) {
					if (typeRepositories[type]) {
						console.log('DOUBLE REGISTER');
					}
					typeRepositories[type] = repository;
				}, callback);
			}, function() {
				emitter.emitAndListen('repositoriesLoaded');
			});
		});
	}

	var directories = [path.join(__dirname, 'repository')];
	if (repositoryConfig.pluginPath) {
		if (repositoryConfig.pluginPath.match(/^\./)) {
			directories.push(path.join(process.cwd(), repositoryConfig.pluginPath));
		}
		else {
			directories.push(repositoryConfig.pluginPath);
		}
	}

	readDirectory(directories);


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
			callback(repository || new ObjectRepository(type));
		});
	};
}

module.exports = new RepositoryFactory();
