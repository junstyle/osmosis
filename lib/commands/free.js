/*jslint node: true */
'use strict'

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
	if (context.pageObj != undefined) {
		context.pageObj.isIdle = true
		context.pageObj = null
	}

	next(context, data)
	done()
}

module.exports.free = free