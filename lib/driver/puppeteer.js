'use strict'

let puppeteer = require('puppeteer'),
	pTimeout = require('p-timeout'),
	driver,
	isLaunchingBrowser = false,
	isCreatingNewPage = false,
	browser,
	pages = [],
	devices = require('puppeteer/DeviceDescriptors')

class Driver {
	constructor(options) {
		this.options = Object.assign({
			concurrency: 1, //page count

			ignoreHTTPSErrors: true,
			// headless: false,
			// executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
			// userDataDir: "C:\\Users\\junstyle\\AppData\\Local\\Google\\Chrome\\Puppeteer",
			defaultViewport: {
				width: 1536,
				height: 1080,
				isMobile: false,
			},
			args: [
				// `--disable-extensions-except=C:\\Users\\junstyle\\AppData\\Local\\Google\\Chrome\\Puppeteer\\Default\\Extensions\\cjpalhdlnbpafiamejdnhcphjbkeiagm\\1.17.0_0`,
			],
		}, options)
		this.events = {}
	}

	request(method, url, params, opts, callback) {
		let browserOptions = this.options
		this.init().then(() => {
			this.getIdlePage().then(page => {
				page.request(method, url, params, opts, browserOptions, callback)
			})
		})
		return this
	}

	on(event, callback) {
		this.events[event] = callback
		return this
	}

	init() {
		let launch = async () => {
			if (browser == null) {
				if (isLaunchingBrowser == false) {
					isLaunchingBrowser = true
					browser = await puppeteer.launch(this.options)
					pages = (await browser.pages()).map(p => new Page(p, this.events, this.options))
					isLaunchingBrowser = false
				}
			}
		}

		return new Promise(resolve => {
			let timer = setInterval(async () => {
				await launch()
				if (browser != null) {
					resolve()
					clearInterval(timer)
				}
			}, 100)
		})
	}

	getIdlePage() {
		let pageCount = this.options.concurrency
		let getPage = async () => {
			for (let i = 0; i < pageCount; i++) {
				if (i < pages.length && pages[i].isIdle) {
					pages[i].isIdle = false
					return pages[i]
				}
			}

			if (pages.length < pageCount && !isCreatingNewPage) {
				isCreatingNewPage = true
				let page = await browser.newPage()
				let pageWrapper = new Page(page, this.events, this.options)
				pages.push(pageWrapper)
				isCreatingNewPage = false

				return pageWrapper
			}
			return null
		}

		return new Promise(resolve => {
			let timer = setInterval(async () => {
				let page = await getPage()
				if (page != null) {
					resolve(page)
					clearInterval(timer)
				}
			}, 100)
		})
	}
}

class Page {
	constructor(page, events, options = {}) {
		this.isIdle = true
		this.page = page
		page.setRequestInterception(true)
		page.on('request', request => {
			// if (request.isNavigationRequest() && request.frame().parentFrame() == null) {
			// 	console.log('page url navigation:' + request.url());
			// }
			if (typeof options.onrequest == 'function') {
				if (options.onrequest(request) === false) {
					request.abort()
					return
				}
			}
			if (request.isNavigationRequest() && request.redirectChain().length > 0) {
				if (events['redirect']) {
					events['redirect'](request.url())
				}
			}
			request.continue()
		})
		page.on('response', response => {
			if (typeof options.onresponse == 'function') {
				options.onresponse(response)
			}
		})
	}

	request(method, url, params, opts, browserOptions, callback) {
		let promise = new Promise(async (resolve) => {
			try {
				let response, cookies = {}, res, data

				this.isIdle = false

				if (browserOptions.defaultViewport && browserOptions.defaultViewport.isMobile) {
					await this.page.emulate(devices['iPhone 8 Plus'])
				}
				if (method.toLowerCase() == 'post') {
					response = await post(this.page, url, params)
				} else {
					response = await this.page.goto(url, opts)
				}

				if (response === null) {
					// https://github.com/puppeteer/puppeteer/issues/2479
					//当设置了page.setRequestInterception(true);有js跳转的页面response会出现null；如alibaba.com
					// console.log("response got null, trying wait.");
					response = await this.page.waitForResponse(() => true)
				}

				for (let cookie of (await this.page.cookies())) {
					cookies[cookie.name] = cookie.value
				}

				res = {
					statusCode: response.status,
					statusMessage: response.statusText,
					headers: response.headers(),
					req: {
						headers: response.request().headers(),
					},
					cookies: cookies,
				}

				if (typeof opts.onLoaded === 'function') {
					await this.page.bringToFront()
					await opts.onLoaded(this.page)
					await this.page.waitFor(1000)
				}

				// data = await response.text();
				data = await this.page.content()

				if (browserOptions.keepPage == true) {
					res.pageObj = this
					callback(null, res, data)
				} else {
					callback(null, res, data)
					this.isIdle = true
				}

				resolve()
			} catch (err) {
				this.isIdle = true

				callback(err)
				resolve()
			}
		})

		pTimeout(promise, 30000, () => {
			callback(null, {}, '')
			console.log('get page content timeout')
			this.isIdle = true
		})
	}
}

async function post(page, url, formData) {

	let formHtml = ''

	Object.keys(formData).forEach(function (name) {
		let value = formData[name]
		formHtml += `
			<input
			  type='hidden'
			  name='${name}'
			  value='${value}'
			/>
		  `
	})

	formHtml = `
		  <form action='${url}' method='post'>
			${formHtml}

			<input type='submit' />
		  </form>
		`

	console.log(formHtml)

	await page.setContent(formHtml)
	const inputElement = await page.$('input[type=submit]')
	const [response] = await Promise.all([
		page.waitForNavigation(), // The promise resolves after navigation has finished
		inputElement.click(), // Clicking the link will indirectly cause a navigation
	])
	return response
}

module.exports = function (options) {
	driver = new Driver(options)
	return driver
}

module.exports.options = function (options) {
	driver = new Driver(options)
	return driver
}

module.exports.request = function (method, uri, data, opts, callback) {
	if (driver == undefined)
		driver = new Driver()
	return driver.request(method, uri, data, opts, callback)
}