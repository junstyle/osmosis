'use strict';

var puppeteer = require('puppeteer');
var browser, pages = [];

function Driver(opts) {
	this.options = Object.assign({
		concurrency: 3 //page count
	}, opts);

	this.events = {};

	this.request = function (method, url, params, opts, callback) {
		initBrowser(this.options).then(() => {
			getIdlePage(this).then((page) => {
				page.request(method, url, params, opts, callback);
			});
		});
		return this;
	};

	this.on = function (event, callback) {
		this.events[event] = callback;
		return this;
	}
}

async function initBrowser(options) {
	if (!browser) {
		browser = await puppeteer.launch(Object.assign({
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
		}, options));
	}
}

function Page(page) {
	this.isIdle = true;
	this.page = page;
	this.request = async function (method, url, params, opts, callback) {
		try {
			this.isIdle = false;

			let response, cookies = {},
				res, data;
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
	};
}

async function post(page, url, formData) {

	let formHtml = '';

	Object.keys(formData).forEach(function (name) {
		value = formData[name]
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

async function getIdlePage(driver) {
	let pageCount = driver.options.concurrency;
	for (let i = 0; i < pageCount; i++) {
		if (i < pages.length && pages[i].isIdle) {
			return pages[i];
		}
	}

	if (pages.length < pageCount) {
		let page = await browser.newPage();
		let pageWrapper = new Page(page);
		if (pages.length < pageCount) {
			pages.push(pageWrapper);

			page.on('request', request => {
				if (request.isNavigationRequest() && request.redirectChain().length > 0) {
					if (driver.events['redirect']) {
						driver.events['redirect'](request.url());
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
			let page = await getIdlePage(driver);
			resolve(page);
		}, 100);
	});
}

module.exports = function (options) {
	return new Driver(options);
}