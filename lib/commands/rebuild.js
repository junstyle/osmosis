/*jslint node: true */
'use strict'
var libxml = require('libxmljs-dom')
/**
 * pRebuildContext for puppeteer driver, if after click, the html has changed
 *
 * @function pRebuildContext
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 */

async function rebuldDoc(context, data, next, done) {
	if (context.page != undefined) {
		var html = await context.page.page.content(),
			location = context.location,
			page = context.page
		context = libxml.parseHtml(html, {
			baseUrl: context.location.href,
			huge: true,
		})
		context.location = location
		context.request = location
		context.page = page
	}
	next(context, data)
	done()
}

module.exports.rebuild = module.exports.pRebuildContext = rebuldDoc