'use strict';

const puppeteer = require('puppeteer');
var driver;

class Driver {
	constructor(options) {
		this._options = Object.assign({
			concurrency: 1 //page count
		}, options);
		this._browser = null;
		this._events = {};
		this._pages = [];
	}

	request(method, url, params, opts, callback) {
		this._init().then(async () => {
			let page = await this._getIdlePage();
			page.request(method, url, params, opts, callback);
		});
		return this;
	}

	on(event, callback) {
		this._events[event] = callback;
		return this;
	}

	async _init() {
		if (!this._browser) {
			this._browser = await puppeteer.launch(Object.assign({
				ignoreHTTPSErrors: true,
				headless: false,
				executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
				userDataDir: "C:\\Users\\junstyle\\AppData\\Local\\Google\\Chrome\\Puppeteer",
				defaultViewport: {
					width: 1536,
					height: 1080
				},
				args: [
					// `--disable-extensions-except=C:\\Users\\junstyle\\AppData\\Local\\Google\\Chrome\\Puppeteer\\Default\\Extensions\\cjpalhdlnbpafiamejdnhcphjbkeiagm\\1.17.0_0`,
				]
			}, this._options));
		}
	}

	async _getIdlePage() {
		let self = this;
		let pageCount = this._options.concurrency;
		for (let i = 0; i < pageCount; i++) {
			if (i < this._pages.length && this._pages[i].isIdle) {
				let page = this._pages[i];
				page.isIdle = false;
				return page;
			}
		}

		if (this._pages.length < pageCount) {
			let page = await self._browser.newPage();
			let pageWrapper = new Page(page);
			if (this._pages.length < pageCount) {
				this._pages.push(pageWrapper);

				page.on('request', request => {
					// if (request.isNavigationRequest() && request.frame().parentFrame() == null) {
					// 	console.log('page url navigation:' + request.url());
					// }
					if (request.isNavigationRequest() && request.redirectChain().length > 0) {
						if (self._events['redirect']) {
							self._events['redirect'](request.url());
						}
					}
				});
				return pageWrapper;
			} else {
				page.close();
			}
		}

		return new Promise(resolve => {
			setTimeout(async () => {
				let page = await self._getIdlePage();
				resolve(page);
			}, 100);
		});
	}
}

class Page {
	constructor(page) {
		this.isIdle = true;
		this.page = page;
	}

	async request(method, url, params, opts, callback) {
		try {
			let response, cookies = {},
				res, data;

			this.isIdle = false;

			if (method.toLowerCase() == 'post') {
				response = await post(this.page, url, params);
			} else {
				response = await this.page.goto(url, opts);
			}

			for (let cookie of (await this.page.cookies())) {
				cookies[cookie.name] = cookie.value;
			}

			res = {
				statusCode: response.status,
				statusMessage: response.statusText,
				headers: response.headers(),
				req: {
					_headers: response.request().headers()
				},
				cookies: cookies
			}

			data = await response.text();

			this.isIdle = true;

			callback(null, res, data);
		} catch (err) {
			this.isIdle = true;

			callback(err);
		}
	}
}

async function post(page, url, formData) {

	let formHtml = '';

	Object.keys(formData).forEach(function (name) {
		let value = formData[name]
		formHtml += `
			<input
			  type='hidden'
			  name='${name}'
			  value='${value}'
			/>
		  `;
	});

	formHtml = `
		  <form action='${url}' method='post'>
			${formHtml}

			<input type='submit' />
		  </form>
		`;

	console.log(formHtml)

	await page.setContent(formHtml);
	const inputElement = await page.$('input[type=submit]');
	const [response] = await Promise.all([
		page.waitForNavigation(), // The promise resolves after navigation has finished
		inputElement.click(), // Clicking the link will indirectly cause a navigation
	]);
	return response;
};

module.exports = function (options) {
	driver = new Driver(options);
	return driver;
}

module.exports.options = function (options) {
	driver = new Driver(options);
	return driver;
}

module.exports.request = function (method, uri, data, opts, callback) {
	if (driver == undefined)
		driver = new Driver();
	return driver.request(method, uri, data, opts, callback);
}