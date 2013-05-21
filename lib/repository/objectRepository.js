var Model = require('model'),
    _ = require('underscore'),
    config = require('luminous-server-config'),
    metadataLoader = config.loadModule('metadata');

var repositoryConfig = config.load().repository;

function ObjectRepository(typeName) {
    var _metadata;
    var _modelMap;

	function getModelInfo(callback) {
		if (_metadata && _modelMap) return callback(null, {
			metadata: _metadata,
			modelMap: _modelMap
		});

	    metadataLoader.load(typeName, function(err, metadata) {
	    	var modelMap = function() {
	    		var me = this;

				this.adapter(repositoryConfig.driver, {dbname: repositoryConfig.dbname});

	        	_.each(metadata.fields, function(field) {
					if (Object.prototype.toString.call(field.type) == '[object Array]') {
		        		me.property(field.field, 'object', {required: false});
					}
					else {
		        		me.property(field.field, 'string', {required: false});
		        	}
	        	});
	    	};

	    	_metadata = metadata;
	    	_modelMap = Model.register(typeName, modelMap);

	    	callback(err, {
	    		metadata: _metadata,
	    		modelMap: _modelMap
	    	});
	    });
	}

	this.create = function(callback) {
		getModelInfo(function(err, modelInfo) {
			var defaultObject = {};
			_.each(modelInfo.metadata.fields, function(field) {
				defaultObject[field.field] = null;
			});

			modelInfo.modelMap.create(defaultObject).save(callback);
		});
	};

	this.save = function(item, callback) {
		getModelInfo(function(err, modelInfo) {
			if (item.save) {
				return item.save(callback);
			}

			modelInfo.modelMap.first({id: item.id}, function(err, data) {
				if (err) return callback(err);

				if (!data) {
					data = modelInfo.modelMap.create(item);
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

		getModelInfo(function(err, modelInfo) {
			modelInfo.modelMap.all(query, options, function(err, items) {
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
		getModelInfo(function(err, modelInfo) {
			modelInfo.modelMap.remove(query, function(err, item) {
				return callback(err, item);
			});
		});
	};
}

ObjectRepository.register = function(register, callback) {
	metadataLoader.list(function(err, items) {
		_.each(items, function(item) {
			register(item, ObjectRepository);
		});
		callback();
	});
};

module.exports = ObjectRepository;
