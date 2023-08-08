import { $, $all, app, store } from './common.js'
import { cm, udfInput, uduInput } from './editor.js'
import { getRates } from './forex.js'
import { generateIcons } from './icons.js'
import { calculate } from './math.js'
import { confirm, notify, showError, showModal } from './modal.js'
import { plot } from './plot.js'
import { settings } from './settings.js'
import { applyUdf, applyUdu } from './userDefined.js'
import { checkSize, isMac, isNode, ipc, toggleMinMax } from './utils.js'

import { DateTime } from 'luxon'

import * as context from './context.js'
import * as pkg from './../../package.json'

import UIkit from 'uikit'

import Mousetrap from 'mousetrap'
import 'mousetrap-global-bind'

// Set theme and maximize if needed
if (isNode) {
  ipc.on('themeUpdate', settings.apply)
  ipc.on('fullscreen', (event, isFullscreen) => {
    if (isFullscreen) {
      ipc.send('maximize')
    }
  })
} else {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      console.log('Service worker registration failed')
    })
  }
}

// Set headers
if (isNode && !isMac) {
  $('#header-mac').remove()
  $('#header-win').style.display = 'block'
  $('#header-win-title').innerHTML = pkg.name

  $('#max').style.display = ipc.sendSync('isMaximized') ? 'none' : 'block'
  $('#unmax').style.display = ipc.sendSync('isMaximized') ? 'block' : 'none'

  $('#winButtons').addEventListener('click', (e) => {
    switch (e.target.id) {
      case 'min':
        ipc.send('minimize')

        break
      case 'max':
        ipc.send('maximize')

        break
      case 'unmax':
        ipc.send('unmaximize')

        break
      case 'close':
        ipc.send('close')

        break
    }

    e.stopPropagation()
  })

  ipc.on('isMax', (event, isMax) => {
    $('#unmax').style.display = isMax ? 'block' : 'none'
    $('#max').style.display = isMax ? 'none' : 'block'
  })

  $('#header-win').addEventListener('dblclick', toggleMinMax)
} else {
  $('#header-win').remove()
  $('#header-mac').style.display = 'block'
  $('#header-mac-title').innerHTML = pkg.name

  if (isNode) {
    $('#header-mac').addEventListener('dblclick', toggleMinMax)
  }
}

// Initialize settings
settings.initialize()

// Generate app icons
generateIcons()

// Get exchange rates
if (app.settings.currency) {
  getRates()
}

// Set initial input value
cm.setValue(store.get('input') || '')

// Set user defined values
if (!store.get('udf')) {
  store.set('udf', '')
}

if (!store.get('udu')) {
  store.set('udu', '')
}

// Tooltip defaults
UIkit.mixin({ data: { delay: 500, offset: 5 } }, 'tooltip')

// App button actions
$('#actions').addEventListener('click', (e) => {
  switch (e.target.id) {
    case 'clearButton':
      if (cm.getValue() !== '') {
        cm.setValue('')
        cm.focus()

        calculate()
      }

      break
    case 'printButton':
      UIkit.tooltip('#printButton').hide()

      $('#print-title').innerHTML = pkg.name
      $('#printBox').innerHTML = $('#panel').innerHTML

      if (isNode) {
        ipc.send('print')
        ipc.on('printReply', (event, response) => {
          if (response) {
            notify(response)
          }

          $('#printBox').innerHTML = ''
        })
      } else {
        window.print()
      }

      break
    case 'copyButton':
      context.copyAll()

      break
    case 'saveButton':
      $('#saveTitle').value = ''
      $('#saveTitle').focus()

      showModal('#dialog-save')

      break
    case 'openButton':
      showModal('#dialog-open')

      break
    case 'udfuButton': // Open custom functions dialog
      showModal('#dialog-udfu')

      break
    case 'settingsButton':
      showModal('#dialog-settings')

      break
    case 'aboutButton':
      showModal('#dialog-about')

      break
  }

  e.stopPropagation()

  UIkit.tooltip('#' + e.target.id).hide()
})

if (isNode) {
  // Export calculations to file
  $('#dialog-save-export').addEventListener('click', () => {
    ipc.send('export', $('#saveTitle').value, cm.getValue())
  })

  ipc.on('exportData', (event, msg) => {
    UIkit.modal('#dialog-save').hide()

    notify(msg, 'success')
  })

  ipc.on('exportDataError', (event, err) => {
    notify(err, 'danger')
  })

  // Import calculations from file
  $('#dialog-save-import').addEventListener('click', () => {
    ipc.send('import')
  })

  ipc.on('importData', (event, data, msg) => {
    UIkit.modal('#dialog-open').hide()

    cm.setValue(data)

    notify(msg, 'success')
  })

  ipc.on('importDataError', (event, err) => {
    notify(err, 'danger')
  })
} else {
  $('#dialog-save-export').remove()
  $('#dialog-save-import').remove()
}

// Output actions
$('#output').addEventListener('click', (e) => {
  const func = e.target.getAttribute('data-func')

  switch (e.target.className) {
    case 'answer':
      navigator.clipboard.writeText(e.target.dataset.copy)

      notify(`Copied '${e.target.dataset.copy}' to clipboard.`)

      break
    case 'plotButton': // Plot function
      app.func = func.startsWith('line') ? app.mathScope[func] : func

      try {
        $('#plotGridModal').checked = app.settings.plotGrid
        $('#plotCrossModal').checked = app.settings.plotCross

        plot()

        showModal('#dialog-plot')
      } catch (error) {
        showError('Error', error)
      }

      break
    case 'lineError': // Show line error
      showError('Error on Line ' + e.target.getAttribute('data-line'), e.target.getAttribute('data-error'))

      break
  }

  e.stopPropagation()
})

// Clear input selections when clicked in output panel
$('#output').addEventListener('mousedown', () => {
  const sels = document.getElementsByClassName('CodeMirror-selected')

  while (sels[0]) {
    sels[0].classList.remove('CodeMirror-selected')
  }
})

// Prevent CM refresh if keydown
document.addEventListener('keydown', (e) => {
  app.refreshCM = !e.repeat
})

document.addEventListener('keyup', () => {
  app.refreshCM = true
})

// Dialog button actions
document.addEventListener('click', (e) => {
  switch (e.target.id) {
    case 'dialog-save-save': {
      const id = DateTime.local().toFormat('yyyyMMddHHmmssSSS')
      const savedItems = store.get('saved') || {}
      const data = cm.getValue()
      const title = $('#saveTitle').value.replace(/<|>/g, '').trim() || 'No title'

      savedItems[id] = [title, data]

      store.set('saved', savedItems)

      UIkit.modal('#dialog-save').hide()

      notify(
        `Saved as '${title}' <a class="notificationLink" onclick="document.querySelector('#openButton').click()">View saved calculations</a>`
      )

      break
    }
    case 'dialog-open-deleteAll':
      confirm('All saved calculations will be deleted.', () => {
        localStorage.removeItem('saved')

        populateSaved()
      })

      break
    case 'dialog-udfu-save-f':
      applyUdf(udfInput.getValue().trim())

      break
    case 'dialog-udfu-save-u':
      applyUdu(uduInput.getValue().trim())

      break
    case 'defaultSettingsButton':
      confirm('All settings will revert back to defaults.', () => {
        app.settings = JSON.parse(JSON.stringify(settings.defaults))

        store.set('settings', app.settings)

        settings.prep()
        settings.save()
        settings.apply()
      })

      break
    case 'dialog-settings-reset':
      confirm('All user settings and data will be lost.', () => {
        if (isNode) {
          ipc.send('resetApp')
        } else {
          localStorage.clear()
          location.reload()
        }
      })

      break
    case 'resetSizeButton':
      if (isNode) {
        ipc.send('resetSize')
      }

      break
    case 'syntax':
      settings.toggleSubs()

      break
    case 'thouSep':
      settings.toggleSubs()

      break
    case 'localeWarn':
      showError(
        'Caution: Locale',
        `Your locale (${app.settings.locale}) uses comma (,) as decimal separator.  Therefore, you must use semicolon (;) as argument separator when using functions.<br><br>Ex. sum(1;3) // 4`
      )

      break
    case 'bigNumWarn':
      showError(
        'Caution: BigNumber Limitations',
        `Using the BigNumber may break function plotting and is not compatible with some math functions. 
          It may also cause unexpected behavior and affect overall performance.<br><br>
          <a target="_blank" href="https://mathjs.org/docs/datatypes/bignumbers.html">Read more on BigNumbers</a>`
      )

      break
    // Plot settings
    case 'plotGridModal':
      app.settings.plotGrid = $('#plotGridModal').checked

      store.set('settings', app.settings)

      plot()

      break
    case 'plotCrossModal':
      app.settings.plotCross = $('#plotCrossModal').checked

      store.set('settings', app.settings)

      plot()

      break
    case 'resetPlot':
      app.activePlot = null
      plot()

      break
    case 'restartButton': // Restart to update
      ipc.send('updateApp')

      break
  }
})

/** Get all saved calculations and prepare list. */
function populateSaved() {
  const savedObj = store.get('saved') || {}
  const savedItems = Object.entries(savedObj)

  $('#dialog-open-body').innerHTML = ''

  if (savedItems.length > 0) {
    $('#dialog-open-deleteAll').disabled = false

    savedItems.forEach(([id, val]) => {
      $('#dialog-open-body').innerHTML += `
          <div class="dialog-open-wrapper" id="${id}">
            <div data-action="load">
              <div class="dialog-open-title">${val[0]}</div>
              <div class="dialog-open-date">${DateTime.fromFormat(id, 'yyyyMMddHHmmssSSS').toFormat('FF')}</div>
            </div>
            <span class="dialog-open-delete" data-action="delete"><i data-lucide="trash"></i></span>
          </div>`
    })

    generateIcons()
  } else {
    $('#dialog-open-deleteAll').disabled = true
    $('#dialog-open-body').innerHTML = 'No saved calculations.'
  }
}

// Open saved calculations dialog actions
$('#dialog-open').addEventListener('click', (e) => {
  const saved = store.get('saved')

  let pid

  if (e.target.parentNode.getAttribute('data-action') === 'load') {
    pid = e.target.parentNode.parentNode.id

    cm.setValue(saved[pid][1])

    calculate()

    UIkit.modal('#dialog-open').hide()
  }

  if (e.target.getAttribute('data-action') === 'delete') {
    pid = e.target.parentNode.id

    confirm('Calculation "' + saved[pid][0] + '" will be deleted.', () => {
      delete saved[pid]

      store.set('saved', saved)

      populateSaved()
    })
  }
})

// Populate saved calculation
UIkit.util.on('#dialog-open', 'beforeshow', populateSaved)

// Initiate settings dialog
UIkit.util.on('#setswitch', 'beforeshow', (e) => {
  e.stopPropagation()
})

UIkit.util.on('#dialog-settings', 'beforeshow', settings.prep)

UIkit.util.on('#dialog-settings', 'hidden', () => {
  cm.focus()
})

$('#precision').addEventListener('input', () => {
  $('#precision-label').innerHTML = $('#precision').value
})

$('#expLower').addEventListener('input', () => {
  $('#expLower-label').innerHTML = $('#expLower').value
})

$('#expUpper').addEventListener('input', () => {
  $('#expUpper-label').innerHTML = $('#expUpper').value
})

document.querySelectorAll('.settingItem').forEach((el) => {
  el.addEventListener('change', () => {
    settings.save()
    settings.apply()
  })
})

// Prepare user defined dialog inputs
UIkit.util.on('#dialog-udfu', 'beforeshow', () => {
  const udf = store.get('udf').trim()
  const udu = store.get('udu').trim()

  udfInput.setValue(udf)
  uduInput.setValue(udu)
})

// Blur input when user defined switcher is shown
UIkit.util.on('.uk-switcher', 'show', () => {
  cm.getInputField().blur()
})

// Focus on input when dialog is closed
UIkit.util.on('.modal', 'hidden', () => {
  cm.focus()
})

// Plot dialog
UIkit.util.on('#dialog-plot', 'shown', plot)

UIkit.util.on('#dialog-plot', 'hide', () => {
  app.activePlot = false
})

// Panel resizer
let resizeDelay
let isResizing = false

const panel = $('#panel')
const divider = $('#panelDivider')

/** Set divider tooltip. */
const dividerTooltip = () => {
  divider.title =
    $('#input').style.width === settings.defaults.inputWidth + '%' ? 'Drag to resize' : 'Double click to reset position'
}

divider.addEventListener('dblclick', () => {
  app.settings.inputWidth = settings.defaults.inputWidth

  store.set('settings', app.settings)

  settings.apply()

  dividerTooltip()
})

divider.addEventListener('mousedown', (e) => {
  isResizing = e.target === divider
})

$('#panel').addEventListener('mouseup', () => {
  isResizing = false
})

$('#panel').addEventListener('mousemove', (e) => {
  if (isResizing) {
    const offset = app.settings.lineNumbers ? 12 : 27
    const pointerRelativeXpos = e.clientX - panel.offsetLeft - offset
    const iWidth = (pointerRelativeXpos / panel.clientWidth) * 100
    const inputWidth = iWidth < 0 ? 0 : iWidth > 100 ? 100 : iWidth

    $('#input').style.width = inputWidth + '%'

    app.settings.inputWidth = inputWidth

    store.set('settings', app.settings)

    clearTimeout(resizeDelay)

    resizeDelay = setTimeout(calculate, 10)
  }

  dividerTooltip()
})

// Relayout plot on window resize
let windowResizeDelay
window.addEventListener('resize', () => {
  if (app.activePlot && $('#dialog-plot').classList.contains('uk-open')) {
    plot()
  }

  clearTimeout(windowResizeDelay)

  windowResizeDelay = setTimeout(calculate, 10)

  checkSize()
})

// Sync scroll
let inputScroll = false
let outputScroll = false

const inputPanel = $('.CodeMirror-scroll')
const outputPanel = $('#output')

inputPanel.addEventListener('scroll', () => {
  if (!inputScroll) {
    outputScroll = true

    outputPanel.scrollTop = inputPanel.scrollTop
  }

  inputScroll = false
})

outputPanel.addEventListener('scroll', () => {
  if (!outputScroll) {
    inputScroll = true

    inputPanel.scrollTop = outputPanel.scrollTop
  }

  outputScroll = false
  $('#scrollTop').style.display = $('#output').scrollTop > 50 ? 'block' : 'none'
})

$('#scrollTop').addEventListener('click', () => {
  $('#output').scrollTop = 0
})

// Mousetrap
const traps = {
  clearButton: ['command+d', 'ctrl+d'],
  printButton: ['command+p', 'ctrl+p'],
  saveButton: ['command+s', 'ctrl+s'],
  openButton: ['command+o', 'ctrl+o']
}

for (const [button, command] of Object.entries(traps)) {
  Mousetrap.bindGlobal(command, (e) => {
    e.preventDefault()

    if ($all('.uk-open').length === 0) {
      $('#' + button).click()
    }
  })
}

// Context menus
if (isNode) {
  cm.on('contextmenu', context.inputContext)

  udfInput.on('contextmenu', context.textboxContext)
  uduInput.on('contextmenu', context.textboxContext)

  $('#output').addEventListener('contextmenu', context.outputContext)

  $all('.textBox').forEach((el) => {
    el.addEventListener('contextmenu', context.textboxContext)
  })

  ipc.on('copyLine', context.copyLine)
  ipc.on('copyAnswer', context.copyAnswer)
  ipc.on('copyLineWithAnswer', context.copyAnswer)
  ipc.on('copyAllLines', context.copyAllLines)
  ipc.on('copyAllAnswers', context.copyAllAnswers)
  ipc.on('copyAll', context.copyAll)
}

// Check for updates.
if (isNode) {
  ipc.send('checkUpdate')

  ipc.on('notifyUpdate', () => {
    notify(
      'Updating Numara... <a class="notificationLink" onclick="document.querySelector(`#aboutButton`).click()">View update status</a>'
    )

    $('#notificationDot').style.display = 'block'
  })

  ipc.on('updateStatus', (event, status) => {
    if (status === 'ready') {
      $('#dialog-about-updateStatus').innerHTML = 'Restart Numara to finish updating.'
      $('#restartButton').style.display = 'inline-block'

      if (!$('#dialog-about').classList.contains('uk-open')) {
        notify(
          'Restart Numara to finish updating. <a class="notificationLink" onclick="document.querySelector(`#restartButton`).click()">Restart Now</a>'
        )
      }
    } else {
      $('#dialog-about-updateStatus').innerHTML = status
    }
  })
}

// Set app info
$('#dialog-about-copyright').innerHTML = `Copyright ©️ ${DateTime.local().year} ${pkg.author.name}`
$('#dialog-about-appVersion').innerHTML = isNode
  ? `Version ${pkg.version}`
  : `Version ${pkg.version}
      <div class="versionCtnr">
        <div>
          <a href="https://github.com/bornova/numara-calculator/releases" target="_blank">Download desktop version</a>
        </div>
      </div>`
$('#gitLink').setAttribute('href', pkg.homepage)
$('#webLink').setAttribute('href', pkg.author.url)
$('#licenseLink').setAttribute('href', pkg.homepage + '/blob/master/LICENSE')
$('#helpLink').setAttribute('href', pkg.homepage + '/wiki')

window.onload = () => {
  applyUdf(store.get('udf'))
  applyUdu(store.get('udu'))

  cm.execCommand('goDocEnd')
  cm.execCommand('goLineEnd')

  $('.cm-s-numara .CodeMirror-code').lastChild.scrollIntoView()

  setTimeout(() => {
    cm.focus()
  }, 200)
}

export { math } from './math.js'
