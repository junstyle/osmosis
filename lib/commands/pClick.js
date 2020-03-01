/*jslint node: true */
'use strict';

/**
 * Click an HTML element and continue after all events finish.
 *
 * @function pClick
 * @param {Selector} selector - Node(s) to click
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 * .pClick('#nav > a')
 */

async function pClick(context, data, next, done) {
	var selector = this.args[0],
		wfOptions = this.args.length > 1 ? this.args[1] : {},
		pageObj = context.page;

	if (pageObj == undefined) {
		if (this.getOpts().debug === true) {
			this.log('please use puppeteer driver for "' + selector + '"');
		}

		return done();
	}

	var page = pageObj.page;
	try {
		await page.waitForSelector(selector, wfOptions);
	} catch (err) {
		if (this.getOpts().debug === true) {
			this.log('no results for "' + selector + '"');
		}

		return done();
	}

	await page.bringToFront();
	await page.click(selector);
	next(context, data);
	done();
}

module.exports.pClick = pClick;