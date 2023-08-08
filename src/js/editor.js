import { $, $all, app } from './common.js'
import { calculate, formatAnswer, math } from './math.js'

import UIkit from 'uikit'
import CodeMirror from 'codemirror'

import 'codemirror/addon/dialog/dialog.js'
import 'codemirror/addon/display/placeholder.js'
import 'codemirror/addon/edit/closebrackets.js'
import 'codemirror/addon/edit/matchbrackets.js'
import 'codemirror/addon/hint/show-hint.js'
import 'codemirror/addon/search/jump-to-line.js'
import 'codemirror/addon/search/search.js'
import 'codemirror/addon/search/searchcursor.js'

import 'codemirror/mode/javascript/javascript.js'

/** CodeMirror input panel. */
export const cm = CodeMirror.fromTextArea($('#inputArea'), {
  autofocus: true,
  inputStyle: 'textarea',
  mode: 'numara',
  singleCursorHeightPerLine: false,
  smartIndent: false,
  theme: 'numara',
  viewportMargin: Infinity
})

// User defined functions and units editors
const udOptions = {
  autoCloseBrackets: true,
  mode: 'javascript',
  smartIndent: false,
  singleCursorHeightPerLine: false,
  tabSize: 2
}

export const udfInput = CodeMirror.fromTextArea($('#udfInput'), udOptions)
export const uduInput = CodeMirror.fromTextArea($('#uduInput'), udOptions)

// Codemirror syntax templates
CodeMirror.defineMode('numara', () => ({
  token: (stream) => {
    if (stream.match(/\/\/.*/) || stream.match(/#.*/)) {
      return 'comment'
    }

    if (stream.match(/\d/)) {
      return 'number'
    }

    if (stream.match(/(?:\+|-|\*|\/|,|;|\.|:|@|~|=|>|<|&|\||_|`|'|\^|\?|!|%)/)) {
      return 'operator'
    }

    stream.eatWhile(/\w/)

    const cmStream = stream.current()

    if (app.settings.currency && (cmStream.toLowerCase() in app.currencyRates || cmStream.toLowerCase() === 'usd')) {
      return 'currency'
    }

    if (typeof math[cmStream] === 'function' && Object.getOwnPropertyNames(math[cmStream]).includes('signatures')) {
      return 'function'
    }

    if (app.udfList.includes(cmStream)) {
      return 'udf'
    }
    if (app.uduList.includes(cmStream)) {
      return 'udu'
    }

    if (cmStream.match(/\b(?:ans|total|subtotal|avg|today|now)\b/)) {
      return 'scope'
    }

    if (cmStream.match(/\b(?:line\d+)\b/)) {
      return 'lineNo'
    }

    try {
      const val = math.evaluate(cmStream)
      const par = math.parse(cmStream)

      if (val.units && val) {
        return 'unit'
      }

      if (par.isSymbolNode && val) {
        return 'constant'
      }
    } catch (e) {
      /** Ignore catch */
    }

    try {
      math.evaluate(cmStream)
    } catch (e) {
      return 'variable'
    }

    stream.next()

    return 'space'
  }
}))

CodeMirror.defineMode('plain', () => ({
  token: (stream) => {
    stream.next()

    return 'text'
  }
}))

// Codemirror autocomplete hints
const numaraHints = ['ans', 'avg', 'now', 'subtotal', 'today', 'total']

Object.getOwnPropertyNames(math).forEach((f) => {
  if (typeof math[f] === 'function' && Object.getOwnPropertyNames(math[f]).includes('signatures')) {
    numaraHints.push(f)
  }
})

CodeMirror.commands.autocomplete = (cm) => {
  CodeMirror.showHint(cm, CodeMirror.hint.numaraHints, {
    completeSingle: false,
    extraKeys: { Enter: 'newline' }
  })
}

CodeMirror.registerHelper('hint', 'numaraHints', (editor) => {
  const cmCursor = editor.getCursor()
  const cmCursorLine = editor.getLine(cmCursor.line)

  let start = cmCursor.ch
  let end = start

  while (end < cmCursorLine.length && /[\w$]/.test(cmCursorLine.charAt(end))) {
    ++end
  }

  while (start && /[\w$]/.test(cmCursorLine.charAt(start - 1))) {
    --start
  }

  const curWord = start !== end && cmCursorLine.slice(start, end)
  const curWordRegex = new RegExp('^' + curWord, 'i')

  return {
    list: (!curWord ? [] : numaraHints.filter((item) => item.match(curWordRegex))).sort(),
    from: CodeMirror.Pos(cmCursor.line, start),
    to: CodeMirror.Pos(cmCursor.line, end)
  }
})

// Codemirror handlers
cm.on('changes', calculate)

cm.on('inputRead', (cm) => {
  if (app.settings.autocomplete) {
    CodeMirror.commands.autocomplete(cm)
  }
})

cm.on('cursorActivity', (cm) => {
  cm.eachLine((line) => {
    const cmLineNo = cm.getLineNumber(line)
    const activeLine = cm.getCursor().line

    if (cmLineNo === activeLine) {
      cm.addLineClass(cmLineNo, 'gutter', 'activeLine')
    } else {
      cm.removeLineClass(cmLineNo, 'gutter', 'activeLine')
    }
  })
})

cm.on('update', () => {
  const funcs = $all('.cm-function')

  if (funcs.length > 0 && app.settings.keywordTips) {
    for (const f of funcs) {
      try {
        const res = JSON.stringify(math.help(f.innerText).toJSON())
        const obj = JSON.parse(res)

        UIkit.tooltip(f, {
          title: obj.description,
          pos: 'top-left'
        })
      } catch (e) {
        UIkit.tooltip(f, {
          title: 'Description not available.',
          pos: 'top-left'
        })
      }
    }
  }

  const udfs = $all('.cm-udf')

  if (udfs.length > 0 && app.settings.keywordTips) {
    for (const f of udfs) {
      UIkit.tooltip(f, {
        title: 'User defined function.',
        pos: 'top-left'
      })
    }
  }

  const udus = $all('.cm-udu')

  if (udus.length > 0 && app.settings.keywordTips) {
    for (const u of udus) {
      UIkit.tooltip(u, {
        title: 'User defined unit.',
        pos: 'top-left'
      })
    }
  }

  const currencies = $all('.cm-currency')

  if (currencies.length > 0 && app.settings.keywordTips) {
    for (const c of currencies) {
      try {
        const currency = c.innerText.toLowerCase()
        const currencyName = currency === 'usd' ? 'U.S. Dollar' : app.currencyRates[currency].name

        UIkit.tooltip(c, {
          title: currencyName,
          pos: 'top-left'
        })
      } catch (e) {
        UIkit.tooltip(c, {
          title: 'Description not available.',
          pos: 'top-left'
        })
      }
    }
  }

  const units = $all('.cm-unit')

  if (units.length > 0 && app.settings.keywordTips) {
    for (const u of units) {
      UIkit.tooltip(u, {
        title: `Unit '${u.innerText}'`,
        pos: 'top-left'
      })
    }
  }

  const constants = $all('.cm-constant')

  if (constants.length > 0 && app.settings.keywordTips) {
    for (const c of constants) {
      UIkit.tooltip(c, {
        title: math.help(c.innerText).doc.description + ' (Constant)',
        pos: 'top-left'
      })
    }
  }

  const vars = $all('.cm-variable')

  if (vars.length > 0 && app.settings.keywordTips) {
    for (const v of vars) {
      if (app.mathScope[v.innerText] && typeof app.mathScope[v.innerText] !== 'function') {
        let varTooltip

        try {
          varTooltip = formatAnswer(math.evaluate(v.innerText, app.mathScope))
        } catch (e) {
          varTooltip = 'Undefined'
        }

        UIkit.tooltip(v, {
          title: varTooltip,
          pos: 'top-left'
        })
      }
    }
  }

  const lineNos = $all('.cm-lineNo')

  if (lineNos.length > 0 && app.settings.keywordTips) {
    for (const ln of lineNos) {
      let scopeTooltip

      try {
        scopeTooltip =
          typeof app.mathScope[ln.innerText] === 'function'
            ? 'Function'
            : formatAnswer(math.evaluate(ln.innerText, app.mathScope))
      } catch (e) {
        scopeTooltip = 'Undefined'
      }

      UIkit.tooltip(ln, {
        title: scopeTooltip,
        pos: 'top-left'
      })
    }
  }
})
