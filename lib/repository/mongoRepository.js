 var _ = require('underscore'),
    config = require('luminous-server-config'),
    metadataLoader = config.loadModule('metadata'),
    EventEmitter = require('futureeventemitter'),
    async = require('async'),//remove when not used
    mongodb = require('mongodb'),
    BSON = mongodb.BSONPure,
    MongoClient = mongodb.MongoClient;

var mongoConfig = config.load().mongoRepository;

function MongoRepository(typeName) {
	var eventEmitter = new EventEmitter();

	var connectionString = 'mongodb://localhost:27017/' + mongoConfig.dbname;
	var hasConnected;
	var _metadata;

	function connect(callback) {
		eventEmitter.on('connection', function(err, db) {
			callback(err, db);
		});

		if (!hasConnected) {
			hasConnected = true;

			metadataLoader.load(typeName, function(err, metadata) {
				_metadata = metadata;
				MongoClient.connect(connectionString, function(err, db) {
					eventEmitter.emitAndListen('connection', err, db);
				});
			});
		}
	}

	this.close = function() {
		connect(function(err, db) {
			db.logout(function() {
				db.close();
			});
		});
	};

    function getAsObjectId(id) {
        if (id.length != 24 || !id.match(/^[0-9a-f]+$/i)) return id;
        return new BSON.ObjectID(id);
    }


	this.find = function(query, options, callback) {
		if (typeof options == 'function') {
			callback = options;
			options = null;
		}
		options = options || {};
		options.limit = options.limit || 20;
		options.order = options.order || {_id: -1};

		if (query && query._id) {
			query._id = getAsObjectId(query._id);
		}

		connect(function(err, db) {
			var collection = db.collection(typeName);
			var find = collection.find(query);
			find = find.limit(options.limit);
			if (options.skip) {
				find = find.skip(options.skip);
			}
			find = find.sort(options.order);
			find.toArray(function(err, result) {
				if (options.setUndefinedFieldsToNull) {
					setUndefinedFieldsToNull(result);
				}

				callback(err, result);
			})
		});
	};

	function setUndefinedFieldsToNull(items) {
		_.each(items, function (item) {
            _.each(_metadata.fields, function(field) {
                item[field.field] = item[field.field] || null;
            });
		});
	}

	var updateQueue = async.queue(function(data, callback) {
		var item = data.item;
		var query = data.query || {_id: item._id};

		if (query._id) {
			query._id = getAsObjectId(query._id);
			item._id = query._id;
		}

		connect(function(err, db) {
			var collection = db.collection(typeName);

			if (item._id || query) {
				collection.update(query, item, {upsert:true}, function(err, result) {
					if (err) return callback(err);
					if (result != 1) return callback(new Error('Did not update any records'));

					collection.findOne({_id: item._id}, function(err, result) {
						if (callback) return callback(err, result);
					})
				});
			}
			else {
				collection.insert(item, {safe: true}, function(err, result) {
					if (callback) return callback(err, result ? result[0] : null);
				});
			}
		});
	}, 1);

	this.save = function(item, query, callback) {
		if (typeof query == 'function') {
			callback = query;
			query = null;
		}

		updateQueue.push({
			query: query,
			item: item
		}, callback);
	};
}

MongoRepository.register = function(register, callback) {
	/*metadataLoader.list(function(err, items) {
		_.each(items, function(item) {
			if (item._id != '/image' && item._id != '/person') return;
			register(item._id, MongoRepository);
		});
		callback();
	});*/
	 callback();
};

module.exports = MongoRepository;


/*MongoClient.connect('mongodb://localhost:27017/luminousTestDb', function(err, db) {
	var sourceCollection = db.collection('/people');
	var targetCollection = db.collection('/person');

	var find = sourceCollection.find({});
	find.toArray(function(err, result) {
		_.each(result, function(item) {
			var newItem = {
				_id: item._id,
				name: item.name,
				imageData: item.imageData
			};

			targetCollection.insert(newItem, {safe: true}, function(err, result) {
			});
		})
	});
});*/

/*MongoClient.connect('mongodb://localhost:27017/luminousTestDb', function(err, db) {
	var sourceCollection = db.collection('/people');
	var targetCollection = db.collection('/person');

	var find = sourceCollection.find({});
	find.toArray(function(err, result) {
		_.each(result, function(item) {
			var newItem = {
				_id: item._id,
				name: item.name,
				imageData: item.imageData
			};

			targetCollection.insert(newItem, {safe: true}, function(err, result) {
			});
		})
	});
});*/