import {W, theLocation} from '@taufik-nurrohman/document';
import {esc, toPattern} from '@taufik-nurrohman/pattern';
import {fromHTML, fromStates, fromValue} from '@taufik-nurrohman/from';
import {isArray, isFunction, isSet, isString} from '@taufik-nurrohman/is';
import {that} from '@taufik-nurrohman/text-editor.source';
import {toCount} from '@taufik-nurrohman/to';

const protocol = theLocation.protocol;

const defaults = {
    source: {
        type: 'Markdown'
    },
    sourceMarkdown: {
        b: '**',
        h1: '===',
        h2: '---',
        i: '_',
        pre: '~~~'
    }
};

const {toggle} = that;

let tagComment = '<!--([\\s\\S](?!-->)*)-->',
    tagName = '[\\w:.-]+',
    tagStart = name => '<(' + name + ')(\\s(?:\'(?:\\\\.|[^\'])*\'|"(?:\\\\.|[^"])*"|[^/>\'"])*)?>',
    tagEnd = name => '</(' + name + ')>',
    tagVoid = name => '<(' + name + ')(\\s(?:\'(?:\\\\.|[^\'])*\'|"(?:\\\\.|[^"])*"|[^/>\'"])*)?/?>';

function toTidy(tidy) {
    if (false !== tidy) {
        if (isString(tidy)) {
            tidy = [tidy, tidy];
        } else if (!isArray(tidy)) {
            tidy = ["", ""];
        }
        if (!isSet(tidy[1])) {
            tidy[1] = tidy[0];
        }
    }
    return tidy; // Return `[…]` or `false`
}

function toggleBlocks(that) {
    let patternBefore = /<(?:h([1-6])|p)(\s[^>]*)?>$/,
        patternAfter = /^<\/(?:h[1-6]|p)>/;
    that.match([patternBefore, /.*/, patternAfter], function (before, value, after) {
        let t = this,
            h = +(before[1] || 0),
            attr = before[2] || "",
            elements = that.state.sourceMarkdown.elements || {},
            element = before[0] ? elements[before[0].slice(1, -1).split(/\s/)[0]] : ["", "", {}];
        if (!attr && element[2]) {
            attr = toAttributes(element[2]);
        }
        // ``
        t.replace(patternBefore, "", -1);
        t.replace(/\n+/g, ' ');
        t.replace(patternAfter, "", 1);
        let tidy = element[3] || elements.h1[3];
        if (false !== (tidy = toTidy(tidy))) {
            t.trim(tidy[0], tidy[1]);
        }
        if (!h) {
            // `<h1>`
            t.wrap('<' + elements.h1[0] + (attr || toAttributes(elements.h1[2])) + '>', '</' + elements.h1[0] + '>');
            if (!value[0] || value[0] === elements.p[1]) {
                t.insert(elements.h1[1]);
            }
        } else {
            ++h;
            if (h > 6) {
                // `<p>`
                t.wrap('<' + elements.p[0] + (attr || toAttributes(elements.p[2])) + '>', '</' + elements.p[0] + '>');
                if (!value[0] || value[0] === elements.h6[1]) {
                    t.insert(elements.p[1]);
                }
            } else {
                // `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`
                t.wrap('<' + elements['h' + h][0] + (attr || toAttributes(elements['h' + h][2])) + '>', '</' + elements['h' + h][0] + '>');
                if (!value[0] || value[0] === elements.p[1]) {
                    t.insert(elements['h' + h][1]);
                }
            }
        }
    });
}

function toggleCodes(that) {
    let patternBefore = /<(?:pre|code)(?:\s[^>]*)?>(?:\s*<code(?:\s[^>]*)?>)?$/,
        patternAfter = /^(?:<\/code>\s*)?<\/(?:pre|code)>/;
    that.match([patternBefore, /.*/, patternAfter], function (before, value, after) {
        let t = this, tidy,
            elements = that.state.sourceMarkdown.elements;
        // ``
        t.replace(patternBefore, "", -1);
        t.replace(patternAfter, "", 1);
        if (after[0]) {
            // ``
            if (/^(?:<\/code>\s*)?<\/pre>/.test(after[0])) {
                tidy = elements[""][3];
                if (false !== (tidy = toTidy(tidy))) {
                    t.trim(tidy[0], tidy[1]);
                }
                t.insert(decode(value[0]));
            // `<pre><code>…</code></pre>`
            } else if (after[0].slice(0, 7) === '</' + elements.code[0] + '>') {
                tidy = elements.pre[3];
                if (false !== (tidy = toTidy(tidy))) {
                    t.trim(tidy[0], tidy[1]);
                }
                t.wrap('<' + elements.pre[0] + toAttributes(elements.pre[2]) + '><' + elements.code[0] + toAttributes(elements.code[2]) + '>', '</' + elements.code[0] + '></' + elements.pre[0] + '>');
            }
        // `<code>…</code>`
        } else {
            tidy = elements.code[3];
            if (false !== (tidy = toTidy(tidy))) {
                t.trim(tidy[0], tidy[1]);
            }
            t.wrap('<' + elements.code[0] + toAttributes(elements.code[2]) + '>', '</' + elements.code[0] + '>').insert(encode(value[0] || elements.code[1]));
        }
    });
}

function toggleQuotes(that) {
    let patternBefore = /<(blockquote|q)(?:\s[^>]*)?>\s*$/,
        patternAfter = /^\s*<\/(blockquote|q)>/;
    that.match([patternBefore, /.*/, patternAfter], function (before, value, after) {
        let t = this, tidy,
            state = that.state,
            charIndent = state.sourceMarkdown.tab || state.source.tab || state.tab || '\t',
            elements = that.state.sourceMarkdown.elements || {};
        // ``
        t.replace(patternBefore, "", -1);
        t.replace(patternAfter, "", 1);
        if (after[0]) {
            // ``
            if (elements.blockquote[0] === after[1]) {
                if (false !== (tidy = toTidy(elements[""][3]))) {
                    t.trim(tidy[0], tidy[1]);
                }
            // `<blockquote>…</blockquote>`
            } else if (elements.q[0] === after[1]) {
                if (false !== (tidy = toTidy(elements.blockquote[3]))) {
                    t.trim(tidy[0], tidy[1]);
                }
                t.wrap('<' + elements.blockquote[0] + toAttributes(elements.blockquote[2]) + '>\n', '\n</' + elements.blockquote[0] + '>').insert(value[0] || elements.blockquote[1]);
                t.replace(toPattern('(^|\\n)'), '$1' + charIndent);
            }
        // `<q>…</q>`
        } else {
            if (false !== (tidy = toTidy(elements.q[3]))) {
                t.trim(tidy[0], tidy[1]);
            }
            t.wrap('<' + elements.q[0] + toAttributes(elements.q[2]) + '>', '</' + elements.q[0] + '>').insert(value[0] || elements.q[1]);
            t.replace(toPattern('(^|\\n)' + charIndent), '$1');
        }
    });
}

function encode(x) {
    return x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decode(x) {
    return x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export const commands = {};

commands.blocks = function () {
    let that = this;
    return that.record(), toggleBlocks(that), that.record(), false;
};

commands.bold = function () {
    let that = this,
        state = that.state,
        b = state.sourceMarkdown.b || '**';
    return that.record(), toggle.apply(that, b), false;
};

commands.code = function () {
    let that = this;
    return that.record(), toggle.apply(that, '`'), false;
};

commands.image = function (label = 'URL:', placeholder) {
    let that = this,
        {after, before, value} = that.$(),
        state = that.state,
        elements = state.sourceMarkdown.elements || {},
        charIndent = state.sourceMarkdown.tab || state.source.tab || state.tab || '\t',
        lineBefore = before.split('\n').pop(),
        lineMatch = lineBefore.match(/^(\s+)/),
        lineMatchIndent = lineMatch && lineMatch[1] || "",
        prompt = state.source.prompt;
    if (isFunction(prompt)) {
        prompt(label, value && /^https?:\/\/\S+$/.test(value) ? value : (placeholder || protocol + '//')).then(src => {
            if (!src) {
                that.focus();
                return;
            }
            let element = elements.img;
            if (value) {
                element[2].alt = value;
                that.record(); // Record selection
            }
            let tidy = element[3] || false;
            if (false !== (tidy = toTidy(tidy))) {
                that.trim(tidy[0], "");
            }
            element[2].src = src;
            if ((!after || '\n' === after[0]) && (!before || '\n' === before.slice(-1))) {
                tidy = elements.figure[3] || false;
                if (false !== (tidy = toTidy(tidy))) {
                    that.trim(tidy[0], tidy[1]);
                }
                that.insert("");
                that.wrap(lineMatchIndent + '<' + elements.figure[0] + toAttributes(elements.figure[2]) + '>\n' + lineMatchIndent + charIndent, lineMatchIndent + '\n</' + elements.figure[0] + '>');
                that.insert('<' + element[0] + toAttributes(element[2]) + '>\n' + lineMatchIndent + charIndent, -1);
                that.wrap('<' + elements.figcaption[0] + toAttributes(elements.figcaption[2]) + '>', '</' + elements.figcaption[0] + '>').insert(elements.figcaption[1]);
            } else {
                that.insert('<' + element[0] + toAttributes(element[2]) + '>' + (false !== tidy ? tidy[1] : ""), -1, true);
            }
        }).catch(e => 0);
    }
    return that.record(), false;
};

commands.italic = function () {
    let that = this,
        state = that.state,
        i = state.sourceMarkdown.i || '_';
    return that.record(), toggle.apply(that, i), false;
};

commands.link = function (label = 'URL:', placeholder) {
    let that = this,
        {value} = that.$(),
        state = that.state,
        elements = state.sourceMarkdown.elements || {},
        prompt = state.source.prompt;
    if (isFunction(prompt)) {
        prompt(label, value && /^https?:\/\/\S+$/.test(value) ? value : (placeholder || protocol + '//')).then(href => {
            if (!href) {
                that.focus();
                return;
            }
            let element = elements.a;
            if (value) {
                that.record(); // Record selection
            }
            element[2].href = href;
            let local = /[.\/?&#]/.test(href[0]) || /^(data|javascript|mailto):/.test(href) || -1 === href.indexOf('://'),
                extras = {};
            if (!local) {
                extras.rel = 'nofollow';
                extras.target = '_blank';
            }
            let tidy = toTidy(element[3] || false);
            if (false === tidy && !value) {
                // Tidy link with a space if there is no selection
                tidy = [' ', ' '];
            }
            toggle.apply(that, [element[0], element[1], fromStates(extras, element[2]), tidy]);
        }).catch(e => 0);
    }
    return that.record(), false;
};

commands.quote = function () {
    let that = this;
    return that.record(), toggleQuotes(that), that.record(), false;
};

export function canKeyDown(map, that) {
    let state = that.state,
        charAfter,
        charBefore,
        charIndent = state.sourceMarkdown.tab || state.source.tab || state.tab || '\t',
        elements = state.sourceMarkdown.elements || {},
        {key, queue} = map;
    if (queue.Control) {
        let {after, before, end, start, value} = that.$(),
            lineAfter = after.split('\n').shift(),
            lineBefore = before.split('\n').pop(),
            lineMatch = lineBefore.match(/^(\s+)/),
            lineMatchIndent = lineMatch && lineMatch[1] || "", m;
        if ('Enter' === key) {
            let m = lineAfter.match(toPattern(tagEnd(tagName) + '\\s*$', "")), n,
                element = elements[n = m && m[1] || 'p'] || elements.p;
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
        let {after, before, end} = that.$(),
            lineBefore = before.split('\n').pop(),
            m = (lineBefore + '>').match(toPattern(tagStart(tagName) + '$', "")), n,
            element = elements[n = m && m[1] || ""];
        if (!n) {
            return true;
        }
        if (element) {
            if (false !== element[1]) {
                if ('>' === after[0]) {
                    that.select(end + 1);
                } else {
                    that.insert('>', -1);
                }
                that.insert('</' + n + '>', 1).insert(element[1]);
            } else {
                if ('>' === after[0]) {
                    that.insert(' /', -1).select(end + 3);
                } else {
                    that.insert(' />', -1);
                }
            }
        } else {
            if ('>' === after[0]) {
                that.select(end + 1);
            } else {
                that.insert('>', -1);
            }
            that.insert('</' + n + '>', 1);
        }
        return that.record(), false;
    }
    if ('Enter' === key) {
        let {after, before, value} = that.$(),
            lineAfter = after.split('\n').shift(),
            lineBefore = before.split('\n').pop(),
            lineMatch = lineBefore.match(/^(\s+)/),
            lineMatchIndent = lineMatch && lineMatch[1] || "", m, n;
        let continueOnEnterTags = ['li', 'option', 'p', 'td', 'th'],
            noIndentOnEnterTags = ['script', 'style'];
        if (m = lineBefore.match(toPattern(tagStart(tagName) + '$', ""))) {
            let element = elements[m[1]];
            if (element && false === element[1]) {
                return that.insert('\n' + lineMatchIndent, -1).record(), false;
            }
        }
        // `<br>`
        if (queue.Shift) {
            let {br} = elements;
            return that.insert('<' + br[0] + toAttributes(br[2]) + '>' + (false === br[1] ? "" : br[1] + '</' + br[0] + '>') + '\n', -1).record(), false;
        }
        if (after && before) {
            for (let i = 0, j = toCount(continueOnEnterTags); i < j; ++i) {
                n = continueOnEnterTags[i];
                if (toPattern('^' + tagEnd(n), "").test(lineAfter) && (m = lineBefore.match(toPattern('^\\s*' + tagStart(n), "")))) {
                    // `<foo>|</foo>`
                    if (m[0] === lineBefore) {
                        if (elements[n] && value && elements[n][1] === value) {
                            that.insert("").wrap('\n' + lineMatchIndent + charIndent, '\n' + lineMatchIndent);
                        // Unwrap if empty!
                        } else {
                            toggle.apply(that, [n]);
                        }
                        return that.record(), false;
                    }
                    // `<foo>bar|</foo>`
                    return that.insert('</' + n + '>\n' + lineMatchIndent + '<' + n + (m[2] || "") + '>', -1).insert(elements[n] ? (elements[n][1] || "") : "").record(), false;
                }
            }
            for (let i = 0, j = toCount(noIndentOnEnterTags); i < j; ++i) {
                n = noIndentOnEnterTags[i];
                if (toPattern('^' + tagEnd(n), "").test(lineAfter) && toPattern(tagStart(n) + '$', "").test(lineBefore)) {
                    return that.wrap('\n' + lineMatchIndent, '\n' + lineMatchIndent).insert(elements[n] ? (elements[n][1] || "") : "").record(), false;
                }
            }
            for (let i = 1; i < 7; ++i) {
                if (lineAfter.startsWith('</' + elements['h' + i][0] + '>') && lineBefore.match(toPattern('^\\s*' + tagStart(elements['h' + i][0]), ""))) {
                    if (elements['h' + i] && value && elements['h' + i][1] === value) {
                        that.insert("").wrap('\n' + lineMatchIndent + charIndent, '\n' + lineMatchIndent);
                    // Insert paragraph below!
                    } else {
                        that.insert('</' + elements['h' + i][0] + '>\n' + lineMatchIndent + '<' + elements.p[0] + '>', -1).replace(toPattern('^' + tagEnd(elements['h' + i][0])), '</' + elements.p[0] + '>', 1).insert(elements.p[1]);
                    }
                    return that.record(), false;
                }
            }
        }
    }
    return true;
}

export const state = defaults;