/*jslint node: true */
'use strict';

const pLimit = require('p-limit');

/**
 * Search for nodes in the current Document.
 *
 * @function findSync
 * @param {Selector|contextCallback|Command.learn} selector
 * @memberof Command
 * @see {@link Command.selectSync}
 * @instance
 */

/**
 * Search for nodes in the current context.
 *
 * @function selectSync
 * @param {Selector|contextCallback|Command.learn} selector - A selector
 * @memberof Command
 * @see {@link Command.findSync}
 * @instance
 */

var FindSync = function (context, data, next, done) {
    var length, nodes, node, selector, i;

    if (this.selector !== undefined) {
        selector = this.selector;
    } else {
        selector = this.contextCallback(context, data);
    }

    if (this.relative === true) {
        nodes = context.find(selector);
    } else {
        nodes = context.doc().find(selector);
    }

    length = nodes.length;

    if (length === 0) {
        done('no results for "' + selector + '"');
        return;
    }

    if (this.getOpts().log === true) {
        this.log('found ' + length + ' results for "' + selector + '"');
    }

    const limit = pLimit(1);

    const input = [];

    for (i = 0; i < length; i++) {
        node = nodes[i];
        node.last = (length - 1 === i);
        node.index = i;
        input.push(limit(() => {
            next(node, data, i);
        }));
    }

    (async () => {
        // Only one promise is run at once
        await Promise.all(input);
        done();
    })();
};

module.exports.findSync =
    module.exports.selectSync = function (selector) {
        var self = this;

        if (typeof selector === 'function') {
            this.contextCallback = selector;
        } else if (selector instanceof Array) {
            this.selector = selector.join(', ');
        } else {
            this.selector = selector;
        }


        // Search relative to the context node
        if (this.name === 'select') {
            this.relative = true;
        } else {
            // Wait to see if we're a nested instance
            process.nextTick(function () {
                if (self.instance.parent !== undefined) {
                    self.relative = true;
                }
            });
        }

        return FindSync;
    };