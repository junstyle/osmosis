/*jslint node: true */
'use strict'

/**
 * wait for element for puppeteer driver
 *
 * @function waitfor
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 * .waitfor()
 */

async function waitfor(context, data, next, done) {
	var selector = this.args[0],
		wfOptions = this.args.length > 1 ? this.args[1] : {},
		pageObj = context.pageObj

	if (pageObj == undefined) {
		if (this.getOpts().debug === true) {
			this.log('please use puppeteer driver for "' + selector + '"')
		}

		return done()
	}

	var page = pageObj.page
	try {
		await page.waitForSelector(selector, wfOptions)
	} catch (err) {
		if (this.getOpts().debug === true) {
			this.log('no results for "' + selector + '"')
		}

		return done()
	}

	next(context, data)
	done()
}

module.exports.waitfor = waitfor