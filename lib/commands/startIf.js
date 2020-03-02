/**
 * Execute following commands if condition is true, util endIf
 */

var If = async function (context, data, next, done) {
	var condition = this.args[0],
		result = true;
	if (typeof condition == 'function') {
		result = await condition.call(this, context, data.getObject());
	}

	if (result == false) {
		var n = this.next;
		while (n != undefined) {
			if (n.name == 'endIf') {
				this.next = n;
				break;
			}
			n = n.next;
		}
	}
	next(context, data);
	done();
};
module.exports.startIf = If;