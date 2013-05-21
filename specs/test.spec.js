var async = require('async'),
    Luminous = require('Luminous');
var luminous = new Luminous();


describe("Luminous Mde Model Repository suite", function() {
	it("must do something", function(done) {
		luminous.repositoryFactory.get('/todo', function(repository) {
			repository.create(function(err, item) {
				expect(err).toBeFalsy();
				expect(item.title).toBeNull();

				done();
			})
		});
	});

	it("must save data that has been modified after getting it from repository", function(done) {
		luminous.repositoryFactory.get('/todo', function(repository) {
			async.waterfall([function(callback) {
				repository.create(function(err, item) {
					expect(err ? err.message : null).toBeFalsy();
					expect(item).toBeTruthy();
					callback(null, item);
				});
			}, function(item, callback) {
				item.title = 'Repository Test';

				repository.save(item, function(err, item) {
					expect(err ? err.message : null).toBeFalsy();
					expect(item).toBeTruthy();
					callback(null, item);
				});
			}, function(savedItem, callback) {
				repository.find({id: savedItem.id}, function(err, results) {
					expect(results.length).toBe(1);
					expect(results[0].title).toBe('Repository Test');

					callback();
				});
			}], done);
		});
	});

	it("must save plain objects that match by id", function(done) {
		luminous.repositoryFactory.get('/todo', function(repository) {
			async.waterfall([function(callback) {
				repository.create(function(err, item) {
					expect(err ? err.message : null).toBeFalsy();
					expect(item).toBeTruthy();
					callback(null, item);
				});
			}, function(item, callback) {
				item = {
					id: item.id,
					title: 'Plain Test'
				};

				repository.save(item, function(err, item) {
					expect(err ? err.message : null).toBeFalsy();
					expect(item).toBeTruthy();
					callback(null, item);
				});
			}, function(savedItem, callback) {
				repository.find({id: savedItem.id}, function(err, results) {
					expect(results.length).toBe(1);
					expect(results[0].title).toBe('Plain Test');

					callback();
				});
			}], done);
		});
	});

	it("must be able to save and retrieve enum values to database", function(done) {
		async.waterfall([function(callback) {
			luminous.repositoryFactory.get('/enum/testType', function(repository) {
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
		async.waterfall([function(callback) {
			luminous.repositoryFactory.get('/enum/testType', function(repository) {
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

		var repositories = {};
		async.series([function(callback) {
			//Initialize repositories
			async.each(testData, function(item, callback) {
				luminous.repositoryFactory.get(item.type, function(repository) {
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
