var Luminous = require('luminous-base'),
    Config = Luminous.Config,
    Model = require('model'),
    FutureEventEmitter = require('FutureEventEmitter'),
    _ = require('underscore');

function ObjectRepository(typeName) {
	var emitter = new FutureEventEmitter();
    var config = new Config();
    var _metadata;

    config.load(function(err, data) {
    	if (err) throw err;

    	if (data) {
	    	var MetadataLoader = require(data.modules.metadata);
	    	var metadataLoader = new MetadataLoader();

            metadataLoader.load(typeName, function(err, metadata) {
            	_metadata = metadata;
            	var modelMap = function() {
            		var me = this;

					var connection = data.dataConnection;
					this.adapter(connection.driver, {dbname: connection.dbname});

	            	_.each(metadata.fields, function(field) {
	            		me.property(field.field, 'string', {required: false});
	            	});
            	};

            	modelMap = Model.register(typeName, modelMap);

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

				if (!data) {
					data = config.modelMap.create(item);
				}
				else {
					data.updateProperties(item);

				}

				if (!data.isValid()) {
					return callback(new Error('Invalid object'));
				}
				data.save(callback);
			});
		});
	};

	function setUndefinedFieldsToNull(items) {
		_.each(items, function (item) {
            _.each(_metadata.fields, function(field) {
                item[field.field] = item[field.field] || null;
            });
		});
	}


	this.find = function(query, options, callback) {
		if (options && !callback) {
			callback = options;
			options = {};
		}

		getConfigInfo(function(config) {
			config.modelMap.all(query, options, function(err, items) {
				if (options.setUndefinedFieldsToNull) {
					setUndefinedFieldsToNull(items);
				}

				//This works around what seems to be in a bug in Model where memory driver returns a single objects instead of an array
				if (!err && typeof(items.length) == 'undefined') {
					return callback(null, [items]);
				}

				return callback(err, items);
			});
		});
	};

	this.remove = function(query, callback) {
		getConfigInfo(function(config) {
			config.modelMap.remove(query, function(err, item) {
				return callback(err, item);
			});
		});
	};
}

ObjectRepository.register = function(register, callback) {
    var config = new Config();

    config.load(function(err, data) {
    	var MetadataLoader = require(data.modules.metadata);
    	var metadataLoader = new MetadataLoader();

    	metadataLoader.list(function(err, items) {
    		_.each(items, function(item) {
    			register(item, ObjectRepository);
    		});
    	});
    	callback();
    });
};

module.exports = ObjectRepository;
