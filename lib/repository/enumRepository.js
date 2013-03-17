var Model = require('model'),
	Luminous = require('luminous-base'),
	Config = Luminous.Config,
	_ = require('underscore'),
	EventEmitter = require('events').EventEmitter;

function EnumRepository(typeName) {
    var emitter = new EventEmitter();
	var config = new Config();

	var Enum;

	function initializeModels(data) {
		Enum = function() {
			var connection = data.dataConnection;
			this.adapter(connection.driver, {dbname: connection.dbname});

			this.property('name', 'string', {required: true});
			this.property('enumType', 'string', {required: false});
		};
		Enum = Model.register('Enum', Enum);
	}

    config.load(function(err, data) {
    	initializeModels(data);

        emitter.emit('configLoaded', err, data);
        emitter.on('newListener', function(eventName, listener) {
            if (eventName == 'configLoaded') {
                listener(err, data);
            }
        });
    });

	this.save = function(item, callback) {
		emitter.once('configLoaded', function(err, data) {
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

	this.find = function(query, callback) {
		callback = !callback ? query : callback;
		query = _.isFunction(query) && !callback ? {} : query;

		query.enumType = typeName;
		emitter.once('configLoaded', function(err, data) {
			Enum.all(query, callback);
		});
	};
}

EnumRepository.register = function(register, callback) {
	register('/enum', EnumRepository);
	callback();
};

module.exports = EnumRepository;
