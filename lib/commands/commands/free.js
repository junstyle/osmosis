/*jslint node: true */
'use strict';

/**
 * free the page of puppeteer Page Object
 *
 * @function free
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 * .free()
 */

function free(context, data, next, done) {
	if (context.page != undefined) {
		context.page.isIdle = true;
		context.page = null;
	}

	next(context, data);
	done();
}

module.exports.free = free;