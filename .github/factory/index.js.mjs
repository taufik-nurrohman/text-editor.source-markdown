import {W, theLocation} from '@taufik-nurrohman/document';
import {esc, toPattern} from '@taufik-nurrohman/pattern';
import {fromHTML, fromStates, fromValue} from '@taufik-nurrohman/from';
import {isArray, isFunction, isSet, isString} from '@taufik-nurrohman/is';
import {that} from '@taufik-nurrohman/text-editor.source';
import {toCount} from '@taufik-nurrohman/to';

import TE from '@taufik-nurrohman/text-editor';

const protocol = theLocation.protocol;

const defaults = {
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

const {toggle} = that;

let tagComment = '<!--([\\s\\S](?!-->)*)-->',
    tagName = '[\\w:.-]+',
    tagStart = name => '<(' + name + ')(\\s(?:\'(?:\\\\.|[^\'])*\'|"(?:\\\\.|[^"])*"|[^/>\'"])*)?>',
    tagEnd = name => '</(' + name + ')>',
    tagVoid = name => '<(' + name + ')(\\s(?:\'(?:\\\\.|[^\'])*\'|"(?:\\\\.|[^"])*"|[^/>\'"])*)?/?>';

function toggleBlocks(that) {
    let {esc} = TE;
    let {after, end, before, start, value} = that.$(),
        h = 0,
        patternAfter,
        patternBefore,
        patternValue,
        state = that.state || {},
        defaults = state.defaults || {}, m;
    // Wrap current line if selection is empty
    if (!value) {
        let lineAfter = after.split('\n').shift(),
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

function toggleCodes(that) {}

function toggleQuotes(that) {}

export const commands = {};

commands.blocks = function () {
    let that = this;
    return that.record(), toggleBlocks(that), that.record(), false;
};

commands.bold = function () {
    let that = this,
        {value} = that.$(),
        state = that.state,
        defaults = state.defaults || {},
        markdown = state.markdown || {},
        e = markdown.b || '**';
    if (!value) {
        that.insert(markdown.defaults.b[1]);
    }
    return that.record(), toggle.apply(that, [e, e, false, markdown.defaults.b[3]]), false;
};

commands.code = function () {
    let that = this,
        {after, before, value} = that.$(),
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

commands.image = function (label = 'URL:', placeholder) {
    let that = this,
        {after, before, value} = that.$(),
        state = that.state,
        charIndent = state.source.tab || state.tab || '\t',
        defaults = state.defaults || {},
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
            let element = defaults.img;
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
        }).catch(e => 0);
    }
    return that.record(), false;
};

commands.italic = function () {
    let that = this,
        {value} = that.$(),
        state = that.state,
        defaults = state.defaults || {},
        markdown = state.markdown || {},
        e = markdown.i || '_';
    if (!value) {
        that.insert(markdown.defaults.i[1]);
    }
    return that.record(), toggle.apply(that, [e, e, false, defaults.i[3]]), false;
};

commands.link = function (label = 'URL:', placeholder) {
    let that = this,
        {value} = that.$(),
        state = that.state,
        defaults = state.defaults || {},
        prompt = state.source.prompt;
    if (isFunction(prompt)) {
        prompt(label, value && /^https?:\/\/\S+$/.test(value) ? value : (placeholder || protocol + '//')).then(href => {
            if (!href) {
                that.focus();
                return;
            }
            let element = defaults.a;
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
        charIndent = state.source.tab || state.tab || '\t',
        defaults = state.defaults || {},
        {key, queue} = map;
    if (queue.Control) {
        let {after, before, end, start, value} = that.$(),
            lineAfter = after.split('\n').shift(),
            lineBefore = before.split('\n').pop(),
            lineMatch = lineBefore.match(/^(\s+)/),
            lineMatchIndent = lineMatch && lineMatch[1] || "", m;
        if ('Enter' === key) {
            let m = lineAfter.match(toPattern(tagEnd(tagName) + '\\s*$', "")), n,
                element = defaults[n = m && m[1] || 'p'] || defaults.p;
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
            element = defaults[n = m && m[1] || ""];
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
            let element = defaults[m[1]];
            if (element && false === element[1]) {
                return that.insert('\n' + lineMatchIndent, -1).record(), false;
            }
        }
        // `<br>`
        if (queue.Shift) {
            let {br} = defaults;
            return that.insert('<' + br[0] + toAttributes(br[2]) + '>' + (false === br[1] ? "" : br[1] + '</' + br[0] + '>') + '\n', -1).record(), false;
        }
        if (after && before) {
            for (let i = 0, j = toCount(continueOnEnterTags); i < j; ++i) {
                n = continueOnEnterTags[i];
                if (toPattern('^' + tagEnd(n), "").test(lineAfter) && (m = lineBefore.match(toPattern('^\\s*' + tagStart(n), "")))) {
                    // `<foo>|</foo>`
                    if (m[0] === lineBefore) {
                        if (defaults[n] && value && defaults[n][1] === value) {
                            that.insert("").wrap('\n' + lineMatchIndent + charIndent, '\n' + lineMatchIndent);
                        // Unwrap if empty!
                        } else {
                            toggle.apply(that, [n]);
                        }
                        return that.record(), false;
                    }
                    // `<foo>bar|</foo>`
                    return that.insert('</' + n + '>\n' + lineMatchIndent + '<' + n + (m[2] || "") + '>', -1).insert(defaults[n] ? (defaults[n][1] || "") : "").record(), false;
                }
            }
            for (let i = 0, j = toCount(noIndentOnEnterTags); i < j; ++i) {
                n = noIndentOnEnterTags[i];
                if (toPattern('^' + tagEnd(n), "").test(lineAfter) && toPattern(tagStart(n) + '$', "").test(lineBefore)) {
                    return that.wrap('\n' + lineMatchIndent, '\n' + lineMatchIndent).insert(defaults[n] ? (defaults[n][1] || "") : "").record(), false;
                }
            }
            for (let i = 1; i < 7; ++i) {
                if (lineAfter.startsWith('</' + defaults['h' + i][0] + '>') && lineBefore.match(toPattern('^\\s*' + tagStart(defaults['h' + i][0]), ""))) {
                    if (defaults['h' + i] && value && defaults['h' + i][1] === value) {
                        that.insert("").wrap('\n' + lineMatchIndent + charIndent, '\n' + lineMatchIndent);
                    // Insert paragraph below!
                    } else {
                        that.insert('</' + defaults['h' + i][0] + '>\n' + lineMatchIndent + '<' + defaults.p[0] + '>', -1).replace(toPattern('^' + tagEnd(defaults['h' + i][0])), '</' + defaults.p[0] + '>', 1).insert(defaults.p[1]);
                    }
                    return that.record(), false;
                }
            }
        }
    }
    return true;
}

export const state = defaults;