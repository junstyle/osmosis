module.exports.endIf = function (context, data, next, done) {
	next(context, data);
	done();
};