function Metadata() {
    this.load = function(typeName, callback) {
        callback(null, {
            _id: '/todo',
            fields: [{
                field: 'title',
                type: '/string'
            }]
        });
    };

    this.list = function(callback) {
    	callback(null, [{
            _id: '/todo',
            fields: [{
                field: 'title',
                type: '/string'
            }]
		}]);
    };
}

module.exports = new Metadata();
