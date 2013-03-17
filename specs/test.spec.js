var RepositoryFactory = require('../lib/repositoryFactory.js'),
	Luminous = require('luminous-base'),
	Config = Luminous.Config,
	mongodb = require('mongodb'),
	MongoClient = mongodb.MongoClient,
	async = require('async');


describe("Luminous Mde Model Repository suite", function() {
	beforeEach(function(done) {
		dropDatabase(done);
	});

	it("must be able to save and retrieve enum values to database", function(done) {
		var repositoryFactory = new RepositoryFactory();
		async.waterfall([function(callback) {
			repositoryFactory.get('/enum/testType', function(repository) {
				callback(null, repository);
			});
		}, function(repository, callback) {
			repository.save('First Value', function(err, item) {
				expect(err).toBeFalsy();
				callback(null, repository);
			});
		}, function(repository, callback) {
			repository.find({name: 'First Value'}, function(err, items) {
				expect(err).toBeFalsy();
				expect(items.length).toBe(1);
				callback(null);
			});
		}], done);
	});

	it("must return all values when no parameters are passed to find", function(done) {
		var repositoryFactory = new RepositoryFactory();
		async.waterfall([function(callback) {
			repositoryFactory.get('/enum/testType', function(repository) {
				callback(null, repository);
			});
		}, function(repository, callback) {
			repository.save('First Value', function(err, item) {
				expect(err).toBeFalsy();
				callback(null, repository);
			});
		}, function(repository, callback) {
			repository.find(function(err, items) {
				expect(err).toBeFalsy();
				expect(items.length).toBe(1);
				callback(null);
			});
		}], done);
	});

	it("must only return enum values of the same type", function(done) {
		var testData = [{
			type: '/enum/testType1',
			value: 'First Value',
			badValue: 'Second Value'
		}, {
			type: '/enum/testType2',
			value: 'Second Value',
			badValue: 'First Value'
		}];

		var repositoryFactory = new RepositoryFactory();
		var repositories = {};
		async.series([function(callback) {
			//Initialize repositories
			async.each(testData, function(item, callback) {
				repositoryFactory.get(item.type, function(repository) {
					repositories[item.type] = repository;
					callback(null);
				});
			}, callback);
		}, function(callback) {
			//Save different values to different repositories
			async.each(testData, function(item, callback) {
				var repository = repositories[item.type];
				repository.save(item.value, function(err, item) {
					expect(err).toBeFalsy();
					callback();
				})
			}, callback);
		}, function(callback) {
			//Verify that crossing the values does not retrieve results
			async.each(testData, function(item, callback) {
				var repository = repositories[item.type];

				async.parallel([function(callback) {
					repository.find({name: item.value}, function(err, data) {
						expect(err).toBeFalsy();
						expect(data.length).toBe(1);
						callback();
					});
				}, function(callback) {
					repository.find(function(err, data) {
						expect(err).toBeFalsy();
						expect(data.length).toBe(1);
						callback();
					})
				}, function(callback) {
					repository.find({name: item.badValue}, function(err, data) {
						expect(err).toBeFalsy();
						expect(data.length).toBe(0);
						callback();
					});
				}], callback);
			}, callback);
		}], done);
	});
});

function dropDatabase(callback) {
	var config = new Config();
	config.load(function(err, data) {
		if (err) throw err;
		MongoClient.connect(data.mongoConnection, function(err, db) {
			if (err) throw err;
			db.dropDatabase(function(err) {
				callback();
				db.logout(function() {
					db.close();
				});
			});
		});
	});
}
