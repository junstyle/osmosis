/*jslint node: true */
'use strict';

/**
 * Click an HTML element and continue after all events finish. for puppeteer
 *
 * @function click2
 * @param {Selector} selector - Node(s) to click
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 * .click2('#nav > a')
 * .then(function(window) {
 *      var ajax = window.document.querySelector("#ajaxContent");
 *
 *      if (ajax.textContent.length > 0) {
 *          this.log("ajax loaded");
 *      }
 * })
 */

async function Click2(context, data, next, done) {
	var self = this,
		selector = this.args[0],
		nodes = context.find(selector);

	if (nodes.length === 0) {
		if (this.getOpts().debug === true) {
			this.debug('no results for "' + selector + '"');
		}

		return done();
	}

	if (context.page) {
		if (this.getOpts().log === true) {
			this.log('click on "' + selector + '"');
		}

		await autoScroll(context.page);
		await context.page.click(selector);
	}
}

const autoScroll = async (page) => {
	await page.evaluate(async () => {
		await new Promise((resolve, reject) => {
			let totalHeight = 0
			let distance = 100
			let timer = setInterval(() => {
				let scrollHeight = document.body.scrollHeight
				window.scrollBy(0, distance)
				totalHeight += distance
				if (totalHeight >= scrollHeight) {
					clearInterval(timer)
					resolve()
				}
			}, 100)
		})
	})
}

module.exports.click2 = Click2;