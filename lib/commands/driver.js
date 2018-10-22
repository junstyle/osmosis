/**
 * Set driver options for the **preceeding** command on down the chain.
 *
 * @function driver
 * @param {string|object} driver - A driver object or string of driver name
 * @param {object} [options] - options for driver
 * @memberof Command
 * @instance
 * @see Osmosis.driver
 */

module.exports = function (_driver, _options) {
	var self = this,
		opts;

	if (self.name === undefined && self.prev !== undefined) {
		self = self.prev;
	}

	opts = self.getOpts();

	if (_driver == 'puppeteer') {
		_driver = require('./../driver/puppeteer');
	}

	if (_driver == undefined) {
		opts['driver'] = require('needle');
	} else {
		if (_options != undefined && typeof _driver.options == 'function') {
			opts['driver'] = _driver.options(_options);
		} else {
			opts['driver'] = _driver;
		}
	}

	return this;
};