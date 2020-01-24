'use strict';

let puppeteer = require('puppeteer'),
	pTimeout = require('p-timeout'),
	driver,
	isLaunchingBrowser = false,
	isCreatingNewPage = false,
	browser,
	pages = [];
const devices = require('puppeteer/DeviceDescriptors');

class Driver {
	constructor(options) {
		this._options = Object.assign({
			concurrency: 1 //page count
		}, options);
		this._events = {};
	}

	request(method, url, params, opts, callback) {
		let browserOptions = this._options;
		this._init().then(() => {
			this._getIdlePage().then(page => {
				page.request(method, url, params, opts, browserOptions, callback);
			});
		});
		return this;
	}

	on(event, callback) {
		this._events[event] = callback;
		return this;
	}

	async _init() {
		let self = this;
		if (browser == null) {
			if (isLaunchingBrowser == false) {
				isLaunchingBrowser = true;
				this._options = Object.assign({
					ignoreHTTPSErrors: true,
					// headless: false,
					// executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
					// userDataDir: "C:\\Users\\junstyle\\AppData\\Local\\Google\\Chrome\\Puppeteer",
					defaultViewport: {
						width: 1536,
						height: 1080,
						isMobile: false
					},
					args: [
						// `--disable-extensions-except=C:\\Users\\junstyle\\AppData\\Local\\Google\\Chrome\\Puppeteer\\Default\\Extensions\\cjpalhdlnbpafiamejdnhcphjbkeiagm\\1.17.0_0`,
					]
				}, this._options);
				browser = await puppeteer.launch(this._options);

				const _pages = await browser.pages();
				pages = _pages.map(_p => new Page(_p, self._events, self._options));

				isLaunchingBrowser = false;
			} else {
				return new Promise(resolve => {
					setTimeout(async () => {
						await self._init();
					}, 100);
				});
			}
		}
	}

	async _getIdlePage() {
		let self = this;
		let pageCount = this._options.concurrency;
		for (let i = 0; i < pageCount; i++) {
			if (i < pages.length && pages[i].isIdle) {
				pages[i].isIdle = false;
				return pages[i];
			}
		}

		if (pages.length < pageCount && !isCreatingNewPage) {
			isCreatingNewPage = true;
			let page = await browser.newPage();
			let pageWrapper = new Page(page, self._events, self._options);
			pages.push(pageWrapper);
			isCreatingNewPage = false;

			return pageWrapper;
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
	constructor(page, events, options = {}) {
		this.isIdle = true;
		this.page = page;
		page.setRequestInterception(true);
		page.on('request', request => {
			// if (request.isNavigationRequest() && request.frame().parentFrame() == null) {
			// 	console.log('page url navigation:' + request.url());
			// }
			if (typeof options.onrequest == 'function') {
				if (options.onrequest(request) === false) {
					request.abort();
					return;
				}
			}
			if (request.isNavigationRequest() && request.redirectChain().length > 0) {
				if (events['redirect']) {
					events['redirect'](request.url());
				}
			}
			request.continue();
		});
		page.on('response', response => {
			if (typeof options.onresponse == 'function') {
				options.onresponse(response);
			}
		});
	}

	async request(method, url, params, opts, browserOptions, callback) {
		let self = this,
			promise = new Promise(async (resolve, reject) => {
				try {
					let response, cookies = {},
						res, data;

					self.isIdle = false;

					if (browserOptions.defaultViewport.isMobile) {
						await self.page.emulate(devices['iPhone 8 Plus']);
					}
					if (method.toLowerCase() == 'post') {
						response = await post(self.page, url, params);
					} else {
						response = await self.page.goto(url, opts);
					}

					if (response === null) {
						//当设置了page.setRequestInterception(true);有js跳转的页面response会出现null；如alibaba.com
						console.log("response got null, trying wait.");
						response = await self.page.waitForResponse(() => true);
					}

					for (let cookie of (await self.page.cookies())) {
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

					if (typeof opts.onLoaded === 'function') {
						await self.page.bringToFront();
						await opts.onLoaded(self.page);
						await self.page.waitFor(1000);
					}

					// data = await response.text();
					data = await self.page.content();

					callback(null, res, data);

					self.isIdle = true;
					resolve();
				} catch (err) {
					self.isIdle = true;

					callback(err);
					resolve();
				}
			});

		pTimeout(promise, 30000, () => {
			callback(null, {}, '');
			console.log('get page content timeout');
			self.isIdle = true;
		})
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