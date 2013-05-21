var Model = require('model'),
	_ = require('underscore'),
    config = require('luminous-server-config'),
	EventEmitter = require('events').EventEmitter;

var repositoryConfig = config.load().repository;

function EnumRepository(typeName) {
	var Enum;

	function initializeModels(connection) {
		Enum = function() {
			this.adapter(connection.driver, {dbname: connection.dbname});

			this.property('name', 'string', {required: true});
			this.property('enumType', 'string', {required: false});
		};
		Enum = Model.register('Enum', Enum);
	}

	initializeModels(repositoryConfig);

	this.save = function(item, callback) {
		getConfigInfo(function(err, data) {
			item = {
				enumType: typeName,
				name: item
			};
			Enum.first(item, function(err, data) {
				if (!data) {
					var e = Enum.create(item);
					e.save(callback);
				} else {
					callback(err, data);
				}
			});
		});
	};

	var configInfo;
	var configErr;

    function getConfigInfo(callback) {
    	callback(null, repositoryConfig);
    }

	this.find = function(query, callback) {
		callback = !callback ? query : callback;
		query = _.isFunction(query) && !callback ? {} : query;

		query.enumType = typeName;
		getConfigInfo(function(err, data) {
			Enum.all(query, function(err, results) {
				if (!err && typeof(results.length) == 'undefined') {
					return callback(null, [results]);
				}

				return callback(err, results);
			});
		});
	};
}

EnumRepository.register = function(register, callback) {
	register('/enum', EnumRepository);
	callback();
};

module.exports = EnumRepository;
