/*jslint node: true */
'use strict';

/**
 * free the page of puppeteer Page Object
 *
 * @function pFree
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 * .pFree()
 */

function pFree(context, data, next, done) {
	if (context.page != undefined) {
		context.page.isIdle = true;
		context.page = null;
	}

	next(context, data);
	done();
}

module.exports.pFree = pFree;