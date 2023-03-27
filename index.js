/*!
 *
 * The MIT License (MIT)
 *
 * Copyright © 2023 Taufik Nurrohman <https://github.com/taufik-nurrohman>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the “Software”), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
(function (g, f) {
    typeof exports === 'object' && typeof module !== 'undefined' ? f(exports) : typeof define === 'function' && define.amd ? define(['exports'], f) : (g = typeof globalThis !== 'undefined' ? globalThis : g || self, f((g.TE = g.TE || {}, g.TE.SourceMarkdown = {})));
})(this, (function (exports) {
    'use strict';
    var hasValue = function hasValue(x, data) {
        return -1 !== data.indexOf(x);
    };
    var isArray = function isArray(x) {
        return Array.isArray(x);
    };
    var isDefined = function isDefined(x) {
        return 'undefined' !== typeof x;
    };
    var isFunction = function isFunction(x) {
        return 'function' === typeof x;
    };
    var isInstance = function isInstance(x, of) {
        return x && isSet(of) && x instanceof of ;
    };
    var isNull = function isNull(x) {
        return null === x;
    };
    var isObject = function isObject(x, isPlain) {
        if (isPlain === void 0) {
            isPlain = true;
        }
        if ('object' !== typeof x) {
            return false;
        }
        return isPlain ? isInstance(x, Object) : true;
    };
    var isSet = function isSet(x) {
        return isDefined(x) && !isNull(x);
    };
    var isString = function isString(x) {
        return 'string' === typeof x;
    };
    var toCount = function toCount(x) {
        return x.length;
    };
    var fromStates = function fromStates() {
        for (var _len = arguments.length, lot = new Array(_len), _key = 0; _key < _len; _key++) {
            lot[_key] = arguments[_key];
        }
        var out = lot.shift();
        for (var i = 0, j = toCount(lot); i < j; ++i) {
            for (var k in lot[i]) {
                // Assign value
                if (!isSet(out[k])) {
                    out[k] = lot[i][k];
                    continue;
                }
                // Merge array
                if (isArray(out[k]) && isArray(lot[i][k])) {
                    out[k] = [ /* Clone! */ ].concat(out[k]);
                    for (var ii = 0, jj = toCount(lot[i][k]); ii < jj; ++ii) {
                        if (!hasValue(lot[i][k][ii], out[k])) {
                            out[k].push(lot[i][k][ii]);
                        }
                    }
                    // Merge object recursive
                } else if (isObject(out[k]) && isObject(lot[i][k])) {
                    out[k] = fromStates({
                        /* Clone! */ }, out[k], lot[i][k]);
                    // Replace value
                } else {
                    out[k] = lot[i][k];
                }
            }
        }
        return out;
    };
    var W = window;
    var theLocation = W.location;
    var isPattern = function isPattern(pattern) {
        return isInstance(pattern, RegExp);
    };
    var toPattern = function toPattern(pattern, opt) {
        if (isPattern(pattern)) {
            return pattern;
        }
        // No need to escape `/` in the pattern string
        pattern = pattern.replace(/\//g, '\\/');
        return new RegExp(pattern, isSet(opt) ? opt : 'g');
    };
    var that = {};
    that.toggle = function (open, close, wrap, tidy) {
        if (tidy === void 0) {
            tidy = false;
        }
        if (!close && "" !== close) {
            close = open;
        }
        var t = this,
            _t$$ = t.$(),
            after = _t$$.after,
            before = _t$$.before,
            value = _t$$.value,
            closeCount = toCount(close),
            openCount = toCount(open);
        if (wrap && close === value.slice(-closeCount) && open === value.slice(0, openCount) || close === after.slice(0, closeCount) && open === before.slice(-openCount)) {
            return t.peel(open, close, wrap);
        }
        if (false !== tidy) {
            if (isString(tidy)) {
                tidy = [tidy, tidy];
            } else if (!isArray(tidy)) {
                tidy = ["", ""];
            }
            if (!isSet(tidy[1])) {
                tidy[1] = tidy[0];
            }
            t.trim(tidy[0], tidy[1]);
        }
        return t.wrap(open, close, wrap);
    };
    var protocol = theLocation.protocol;
    var defaults = {
        markdown: {
            b: '**',
            h1: '=',
            h2: '-',
            h3: '### ',
            h4: '#### ',
            h5: '##### ',
            h6: '###### ',
            i: '_',
            pre: '~~~'
        },
        source: {
            type: 'Markdown'
        }
    };
    var toggle = that.toggle;
    var tagName = '[\\w:.-]+',
        tagStart = function tagStart(name) {
            return '<(' + name + ')(\\s(?:\'(?:\\\\.|[^\'])*\'|"(?:\\\\.|[^"])*"|[^/>\'"])*)?>';
        },
        tagEnd = function tagEnd(name) {
            return '</(' + name + ')>';
        };

    function toggleBlocks(that) {
        var _that$$ = that.$(),
            after = _that$$.after,
            end = _that$$.end,
            before = _that$$.before,
            start = _that$$.start,
            value = _that$$.value,
            h = 0,
            patternAfter,
            patternBefore,
            patternValue,
            state = that.state || {},
            defaults = state.defaults || {},
            m;
        // Wrap current line if selection is empty
        if (!value) {
            var lineAfter = after.split('\n').shift(),
                lineBefore = before.split('\n').pop();
            that.select(start - toCount(lineBefore), end + toCount(lineAfter)).trim('\n\n', '\n\n');
            value = that.$().value;
        }
        if (m = (patternBefore = toPattern('(^|\\n)([#]{1,6})[ ]+$')).exec(before)) {
            h = toCount(m[2]);
            that.replace(patternBefore, '$1', -1);
            value = that.$().value || defaults['h' + h][1];
        }
        if (m = (patternValue = toPattern('^([#]{1,6})[ ]+')).exec(value)) {
            h = toCount(m[1]);
            that.replace(patternValue, "");
            value = that.$().value || defaults['h' + h][1];
        }
        if (m = (patternAfter = toPattern('\\n([-]+|[=]+)(\\n|$)')).exec(after)) {
            h = '=' === m[1][0] ? 1 : 2;
            that.replace(patternAfter, '$2', 1);
            value = that.$().value || defaults['h' + h][1];
        }
        if (m = (patternValue = toPattern('^([^\\n]+)\\n([-]+|[=]+)$')).exec(value)) {
            h = '=' === m[2][0] ? 1 : 2;
            that.replace(patternValue, '$1');
            value = that.$().value || defaults['h' + h][1];
        }
        if (!h) {
            if (!value || value === defaults.h1[1] || value === defaults.h2[1] || value === defaults.h3[1] || value === defaults.h4[1] || value === defaults.h5[1] || value === defaults.h6[1] || value === defaults.p[1]) {
                that.insert(value = defaults.h1[1]);
            }
            that.trim('\n\n', '\n\n').wrap("", '\n' + '='.repeat(toCount(value)));
            ++h;
        } else {
            if (!value || value === defaults.h1[1] || value === defaults.h2[1] || value === defaults.h3[1] || value === defaults.h4[1] || value === defaults.h5[1] || value === defaults.h6[1] || value === defaults.p[1]) {
                that.insert(value = defaults[h > 5 ? 'p' : 'h' + (h + 1)][1]);
            }
            if (1 === h) {
                that.wrap("", '\n' + '-'.repeat(toCount(value)));
                ++h;
            } else if (h < 6) {
                that.wrap('#'.repeat(h + 1) + ' ', "");
                ++h;
            } else {
                h = 0;
            }
        }
    }
    var commands = {};
    commands.blocks = function () {
        var that = this;
        return that.record(), toggleBlocks(that), that.record(), false;
    };
    commands.bold = function () {
        var that = this,
            _that$$2 = that.$(),
            value = _that$$2.value,
            state = that.state;
        state.defaults || {};
        var markdown = state.markdown || {},
            e = markdown.b || '**';
        if (!value) {
            that.insert(markdown.defaults.b[1]);
        }
        return that.record(), toggle.apply(that, [e, e, false, markdown.defaults.b[3]]), false;
    };
    commands.code = function () {
        var that = this,
            _that$$3 = that.$(),
            after = _that$$3.after,
            before = _that$$3.before,
            value = _that$$3.value,
            state = that.state,
            defaults = state.defaults || {},
            markdown = state.markdown || {},
            e = markdown.code || '`';
        if (!value) {
            that.insert(defaults.code[1]);
        }
        if (e === after[0] && e === before.slice(-1)) {
            // Decode
            that.replace(/``/g, '`');
        } else {
            // Encode
            that.replace(/`/g, '``');
        }
        return that.record(), toggle.apply(that, [e, e, false, defaults.code[3]]), false;
    };
    commands.image = function (label, placeholder) {
        if (label === void 0) {
            label = 'URL:';
        }
        var that = this,
            _that$$4 = that.$(),
            after = _that$$4.after,
            before = _that$$4.before,
            value = _that$$4.value,
            state = that.state,
            charIndent = state.source.tab || state.tab || '\t',
            defaults = state.defaults || {},
            lineBefore = before.split('\n').pop(),
            lineMatch = lineBefore.match(/^(\s+)/),
            lineMatchIndent = lineMatch && lineMatch[1] || "",
            prompt = state.source.prompt;
        if (isFunction(prompt)) {
            prompt(label, value && /^https?:\/\/\S+$/.test(value) ? value : placeholder || protocol + '//').then(function (src) {
                if (!src) {
                    that.focus();
                    return;
                }
                var element = defaults.img;
                if (value) {
                    element[2].alt = value;
                    that.record(); // Record selection
                }
                var tidy = element[3] || false;
                if (false !== (tidy = toTidy(tidy))) {
                    that.trim(tidy[0], "");
                }
                element[2].src = src;
                if ((!after || '\n' === after[0]) && (!before || '\n' === before.slice(-1))) {
                    tidy = defaults.figure[3] || false;
                    if (false !== (tidy = toTidy(tidy))) {
                        that.trim(tidy[0], tidy[1]);
                    }
                    that.insert("");
                    that.wrap(lineMatchIndent + '<' + defaults.figure[0] + toAttributes(defaults.figure[2]) + '>\n' + lineMatchIndent + charIndent, lineMatchIndent + '\n</' + defaults.figure[0] + '>');
                    that.insert('<' + element[0] + toAttributes(element[2]) + '>\n' + lineMatchIndent + charIndent, -1);
                    that.wrap('<' + defaults.figcaption[0] + toAttributes(defaults.figcaption[2]) + '>', '</' + defaults.figcaption[0] + '>').insert(defaults.figcaption[1]);
                } else {
                    that.insert('<' + element[0] + toAttributes(element[2]) + '>' + (false !== tidy ? tidy[1] : ""), -1, true);
                }
            }).catch(function (e) {
                return 0;
            });
        }
        return that.record(), false;
    };
    commands.italic = function () {
        var that = this,
            _that$$5 = that.$(),
            value = _that$$5.value,
            state = that.state,
            defaults = state.defaults || {},
            markdown = state.markdown || {},
            e = markdown.i || '_';
        if (!value) {
            that.insert(markdown.defaults.i[1]);
        }
        return that.record(), toggle.apply(that, [e, e, false, defaults.i[3]]), false;
    };
    commands.link = function (label, placeholder) {
        if (label === void 0) {
            label = 'URL:';
        }
        var that = this,
            _that$$6 = that.$(),
            value = _that$$6.value,
            state = that.state,
            defaults = state.defaults || {},
            prompt = state.source.prompt;
        if (isFunction(prompt)) {
            prompt(label, value && /^https?:\/\/\S+$/.test(value) ? value : placeholder || protocol + '//').then(function (href) {
                if (!href) {
                    that.focus();
                    return;
                }
                var element = defaults.a;
                if (value) {
                    that.record(); // Record selection
                }
                element[2].href = href;
                var local = /[.\/?&#]/.test(href[0]) || /^(data|javascript|mailto):/.test(href) || -1 === href.indexOf('://'),
                    extras = {};
                if (!local) {
                    extras.rel = 'nofollow';
                    extras.target = '_blank';
                }
                var tidy = toTidy(element[3] || false);
                if (false === tidy && !value) {
                    // Tidy link with a space if there is no selection
                    tidy = [' ', ' '];
                }
                toggle.apply(that, [element[0], element[1], fromStates(extras, element[2]), tidy]);
            }).catch(function (e) {
                return 0;
            });
        }
        return that.record(), false;
    };
    commands.quote = function () {
        var that = this;
        return that.record(), that.record(), false;
    };

    function canKeyDown(map, that) {
        var state = that.state,
            charIndent = state.source.tab || state.tab || '\t',
            defaults = state.defaults || {},
            key = map.key,
            queue = map.queue;
        if (queue.Control) {
            var _that$$7 = that.$(),
                after = _that$$7.after,
                before = _that$$7.before,
                end = _that$$7.end,
                start = _that$$7.start;
            _that$$7.value;
            var lineAfter = after.split('\n').shift(),
                lineBefore = before.split('\n').pop(),
                lineMatch = lineBefore.match(/^(\s+)/),
                lineMatchIndent = lineMatch && lineMatch[1] || "";
            if ('Enter' === key) {
                var _m = lineAfter.match(toPattern(tagEnd(tagName) + '\\s*$', "")),
                    element = defaults[_m && _m[1] || 'p'] || defaults.p;
                element[3] = ['\n' + lineMatchIndent, '\n' + lineMatchIndent];
                that.select(queue.Shift ? start - toCount(lineBefore) : end + toCount(lineAfter));
                toggle.apply(that, element);
                return that.record(), false;
            }
        }
        // Do nothing
        if (queue.Alt || queue.Control) {
            return true;
        }
        if ('>' === key) {
            var _that$$8 = that.$(),
                _after = _that$$8.after,
                _before = _that$$8.before,
                _end = _that$$8.end,
                _lineBefore = _before.split('\n').pop(),
                _m2 = (_lineBefore + '>').match(toPattern(tagStart(tagName) + '$', "")),
                _n,
                _element = defaults[_n = _m2 && _m2[1] || ""];
            if (!_n) {
                return true;
            }
            if (_element) {
                if (false !== _element[1]) {
                    if ('>' === _after[0]) {
                        that.select(_end + 1);
                    } else {
                        that.insert('>', -1);
                    }
                    that.insert('</' + _n + '>', 1).insert(_element[1]);
                } else {
                    if ('>' === _after[0]) {
                        that.insert(' /', -1).select(_end + 3);
                    } else {
                        that.insert(' />', -1);
                    }
                }
            } else {
                if ('>' === _after[0]) {
                    that.select(_end + 1);
                } else {
                    that.insert('>', -1);
                }
                that.insert('</' + _n + '>', 1);
            }
            return that.record(), false;
        }
        if ('Enter' === key) {
            var _that$$9 = that.$(),
                _after2 = _that$$9.after,
                _before2 = _that$$9.before,
                _value = _that$$9.value,
                _lineAfter = _after2.split('\n').shift(),
                _lineBefore2 = _before2.split('\n').pop(),
                _lineMatch = _lineBefore2.match(/^(\s+)/),
                _lineMatchIndent = _lineMatch && _lineMatch[1] || "",
                _m3,
                _n2;
            var continueOnEnterTags = ['li', 'option', 'p', 'td', 'th'],
                noIndentOnEnterTags = ['script', 'style'];
            if (_m3 = _lineBefore2.match(toPattern(tagStart(tagName) + '$', ""))) {
                var _element2 = defaults[_m3[1]];
                if (_element2 && false === _element2[1]) {
                    return that.insert('\n' + _lineMatchIndent, -1).record(), false;
                }
            }
            // `<br>`
            if (queue.Shift) {
                var br = defaults.br;
                return that.insert('<' + br[0] + toAttributes(br[2]) + '>' + (false === br[1] ? "" : br[1] + '</' + br[0] + '>') + '\n', -1).record(), false;
            }
            if (_after2 && _before2) {
                for (var i = 0, j = toCount(continueOnEnterTags); i < j; ++i) {
                    _n2 = continueOnEnterTags[i];
                    if (toPattern('^' + tagEnd(_n2), "").test(_lineAfter) && (_m3 = _lineBefore2.match(toPattern('^\\s*' + tagStart(_n2), "")))) {
                        // `<foo>|</foo>`
                        if (_m3[0] === _lineBefore2) {
                            if (defaults[_n2] && _value && defaults[_n2][1] === _value) {
                                that.insert("").wrap('\n' + _lineMatchIndent + charIndent, '\n' + _lineMatchIndent);
                                // Unwrap if empty!
                            } else {
                                toggle.apply(that, [_n2]);
                            }
                            return that.record(), false;
                        }
                        // `<foo>bar|</foo>`
                        return that.insert('</' + _n2 + '>\n' + _lineMatchIndent + '<' + _n2 + (_m3[2] || "") + '>', -1).insert(defaults[_n2] ? defaults[_n2][1] || "" : "").record(), false;
                    }
                }
                for (var _i = 0, _j = toCount(noIndentOnEnterTags); _i < _j; ++_i) {
                    _n2 = noIndentOnEnterTags[_i];
                    if (toPattern('^' + tagEnd(_n2), "").test(_lineAfter) && toPattern(tagStart(_n2) + '$', "").test(_lineBefore2)) {
                        return that.wrap('\n' + _lineMatchIndent, '\n' + _lineMatchIndent).insert(defaults[_n2] ? defaults[_n2][1] || "" : "").record(), false;
                    }
                }
                for (var _i2 = 1; _i2 < 7; ++_i2) {
                    if (_lineAfter.startsWith('</' + defaults['h' + _i2][0] + '>') && _lineBefore2.match(toPattern('^\\s*' + tagStart(defaults['h' + _i2][0]), ""))) {
                        if (defaults['h' + _i2] && _value && defaults['h' + _i2][1] === _value) {
                            that.insert("").wrap('\n' + _lineMatchIndent + charIndent, '\n' + _lineMatchIndent);
                            // Insert paragraph below!
                        } else {
                            that.insert('</' + defaults['h' + _i2][0] + '>\n' + _lineMatchIndent + '<' + defaults.p[0] + '>', -1).replace(toPattern('^' + tagEnd(defaults['h' + _i2][0])), '</' + defaults.p[0] + '>', 1).insert(defaults.p[1]);
                        }
                        return that.record(), false;
                    }
                }
            }
        }
        return true;
    }
    var state = defaults;
    exports.canKeyDown = canKeyDown;
    exports.commands = commands;
    exports.state = state;
    Object.defineProperty(exports, '__esModule', {
        value: true
    });
}));