var Luminous = require('luminous-base'),
    Config = Luminous.Config,
    Model = require('model'),
    FutureEventEmitter = require('FutureEventEmitter'),
    _ = require('underscore');

function ObjectRepository(typeName) {
	var emitter = new FutureEventEmitter();
    var config = new Config();

    config.load(function(err, data) {
    	if (data) {
	    	var MetadataLoader = require(data.modules.metadata);
	    	var metadataLoader = new MetadataLoader();

            metadataLoader.load('/todo', function(err, metadata) {
            	var modelMap = function() {
            		var me = this;

					var connection = data.dataConnection;
					this.adapter(connection.driver, {dbname: connection.dbname});

	            	_.each(metadata.fields, function(field) {
	            		me.property(field.field, 'string', {required: false});
	            	});
            	};


            	modelMap = Model.register('/todo', modelMap);

            	emitter.emitAndListen('configLoaded', {
            		metadata: metadata,
            		modelMap: modelMap
            	});
            });
	    }
    });

    function getConfigInfo(callback) {
    	emitter.once('configLoaded', callback);
    }

	this.create = function(callback) {
		getConfigInfo(function(config) {
			var defaultObject = {};
			_.each(config.metadata.fields, function(field) {
				defaultObject[field.field] = null;
			});

			config.modelMap.create(defaultObject).save(callback);
		});
	};

	this.save = function(item, callback) {
		getConfigInfo(function(config) {
			if (item.save) {
				return item.save(callback);
			}

			config.modelMap.first({id: item.id}, function(err, data) {
				if (err) return callback(err);
				if (!data) return callback(new Error('Failed to retrieve item ' + typeName + ': ' + item.id));

				_.chain(item)
				.pairs()
				.each(function(pair) {
					data[pair[0]] = pair[1];
				});

				if (!data.isValid()) {
					return callback(new Error('Invalid object'));
				}
				data.save(callback);
			});
		});
	};

	this.find = function(query, callback) {
		getConfigInfo(function(config) {
			config.modelMap.all(query, function(err, item) {
				//This works around what seems to be in a bug in Model where memory driver returns a single objects instead of an array
				if (!err && typeof(item.length) == 'undefined') {
					return callback(null, [item]);
				}

				return callback(err, item);
			});
		});
	};
}

ObjectRepository.register = function(register, callback) {
	register('/todo', ObjectRepository);
	callback();
};

module.exports = ObjectRepository;
