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
	if (context.pageObj != undefined) {
		var html = await context.pageObj.page.content(),
			location = context.location,
			page = context.pageObj
		context = libxml.parseHtml(html, {
			baseUrl: context.location.href,
			huge: true,
		})
		context.location = location
		context.request = location
		context.pageObj = page
	}
	next(context, data)
	done()
}

module.exports.rebuild = module.exports.pRebuildContext = rebuldDoc