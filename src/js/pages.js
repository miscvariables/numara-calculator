import { $, $all, app, store } from './common'
import { cm } from './editor'
import { generateIcons } from './icons'
import { confirm, notify, showModal } from './modal'
import { isElectron } from './utils'

import { DateTime } from 'luxon'

import UIkit from 'uikit'

export function getPageName() {
  const pages = store.get('pages')
  const regex = new RegExp(/\b(Page \d+)$\b/)

  let pageNo = 1

  if (pages) {
    const pageNos = pages
      .filter((page) => regex.test(page.name.trim()))
      .map((page) => +page.name.split(' ')[1])
      .sort((a, b) => a - b)

    const min = Math.min(...pageNos)
    const max = Math.max(...pageNos)

    for (let i = 0; i < max; i++) {
      if (min > 1) {
        pageNo = 1
        break
      }

      if (pageNos[i + 1] !== pageNos[i] + 1) {
        pageNo = pageNos[i] + 1
        break
      }
    }
  }

  return 'Page ' + pageNo
}

/** Generate default page */
export function defaultPage() {
  const pageId = DateTime.local().toFormat('yyyyMMddHHmmssSSS')
  const pageName = getPageName()

  app.activePage = pageId

  store.set('lastPage', pageId)
  store.set('pages', [{ id: pageId, name: pageName, data: '' }])

  cm.setValue(store.get('input') || '')

  $('#pageName').innerHTML = pageName

  populatePages()
}

/** Get last page from store */
export function lastPage() {
  return store.get('lastPage')
}

/**
 * Create new page
 *
 * @param {boolean} isImport Is the new page imported? true | false
 */
export function newPage(isImport) {
  const pageId = DateTime.local().toFormat('yyyyMMddHHmmssSSS')
  const pages = store.get('pages')
  const pageName =
    $('#newPageTitleInput').value.replace(/<|>/g, '').trim() || (isImport ? 'Imported page' : getPageName())

  app.activePage = pageId

  pages.push({ id: pageId, name: pageName, data: '' })

  store.set('pages', pages)
  store.set('lastPage', pageId)

  cm.setValue('')

  populatePages()

  $('#pageName').innerHTML = pageName

  UIkit.modal('#dialog-newPage').hide()
}

/**
 * Load page
 *
 * @param {*} pageId Id of the page to load
 */
export function loadPage(pageId) {
  const page = store.get('pages').find((page) => page.id === pageId)
  const cursor = page.cursor

  app.activePage = pageId

  store.set('lastPage', pageId)

  $('#pageName').innerHTML = page.name

  cm.setValue(page.data)

  cm.execCommand('goLineEnd')

  if (page.history) {
    cm.setHistory(page.history)
  }

  if (cursor) {
    cm.setCursor(cursor)
  }

  populatePages()
}

/** Populate the page list in side bar */
export function populatePages() {
  const pages = store.get('pages')

  if (!pages || pages.length === 0) {
    defaultPage()
  }

  $('#pageList').innerHTML = ''

  pages.forEach((page) => {
    const pageListItem = document.createElement('div')

    pageListItem.id = page.id
    pageListItem.classList.add(
      'pageListItem',
      'uk-flex-middle',
      app.activePage === page.id ? 'activePage' : 'inactivePage'
    )
    pageListItem.innerHTML = `
      <div class="uk-flex-1" data-action="load">
        <div id="page-${page.id}"class="pageListItemTitle" title="${page.name}">${page.name}</div>
        <div class="dialog-open-date">${DateTime.fromFormat(page.id, 'yyyyMMddHHmmssSSS').toFormat('FF')}</div>
      </div>
      <div class="uk-flex-right uk-margin-small-right">
        <span class="drop-parent-icon"><i data-lucide="ellipsis-vertical"></i></span>
        <div uk-dropdown="mode: click; pos: left-top; offset: 0; bg-scroll: false; close-on-scroll: true">
          <div class="renamePageButton uk-flex uk-flex-column" data-action="rename" title="Rename">Rename</div>
          <div class="dupPageButton uk-flex uk-flex-column" data-action="duplicate" title="Duplicate">Duplicate</div>
          <div class="deletePageButton uk-flex uk-flex-column" data-action="delete" title="Delete">Delete</div>
        </div>
      </div>
    `

    pageListItem.addEventListener('click', (event) => {
      if (event.target.parentNode.dataset.action === 'load') {
        loadPage(page.id)

        UIkit.offcanvas('#sidePanel').hide()
      }

      switch (event.target.dataset.action) {
        case 'rename':
          UIkit.dropdown(event.target.parentNode).hide(0)
          renamePage(page.id)
          break
        case 'delete':
          deletePage(page.id)
          break
        case 'duplicate':
          duplicatePage(page.id)
          break
      }
    })

    $('#pageList').appendChild(pageListItem)
  })

  sortPages()

  generateIcons()
}

/**
 * Delete page
 *
 * @param {*} pageId Id of the page to delete
 */
export function deletePage(pageId) {
  let pages = store.get('pages')

  confirm('"' + pages.find((page) => page.id === pageId).name + '" will be deleted.', () => {
    pages = pages.filter((page) => page.id !== pageId)

    store.set('pages', pages)

    if (pages.length === 0) {
      defaultPage()
    } else if (pageId === app.activePage) {
      loadPage(pages.pop().id)
    }

    populatePages()
  })
}

/**
 * Rename page
 *
 * @param {*} pageId Id of the page to rename
 */
export function renamePage(pageId) {
  const pages = store.get('pages')
  const page = pages.find((page) => page.id === pageId)

  $('#renamePageTitleInput').value = page.name

  showModal('#dialog-renamePage')

  function rename() {
    page.name = $('#renamePageTitleInput').value.replace(/<|>/g, '').trim() || getPageName()

    store.set('pages', pages)

    populatePages()

    $('#pageName').innerHTML = page.name

    UIkit.modal('#dialog-renamePage').hide()

    $('#dialog-renamePage-save').removeEventListener('click', rename)
  }

  $('#dialog-renamePage-save').addEventListener('click', rename)
}

/**
 * Duplicate page
 *
 * @param {*} pageId Id of the page to duplicate
 */
export function duplicatePage(pageId) {
  const dupPageId = DateTime.local().toFormat('yyyyMMddHHmmssSSS')
  const pages = store.get('pages')
  const dupPage = pages.find((page) => page.id === pageId)
  const dupPageData = dupPage.data
  const dupPageName = dupPage.name + ' (copy)'

  app.activePage = dupPageId

  pages.push({ id: dupPageId, name: dupPageName, data: dupPageData })

  store.set('pages', pages)

  loadPage(dupPageId)
}

/** Sort page list */
export function sortPages() {
  const pages = store.get('pages')
  const pageList = $all('#pageList > div')

  let sortedPages = [...pageList].reduce((a, i) => {
    a.push(pages.find((page) => page.id === i.getAttribute('id')))
    return a
  }, [])

  store.set('pages', sortedPages)
}

$('#closeSidePanelButton').addEventListener('click', () => {
  UIkit.offcanvas('#sidePanel').hide()
})

$('#newPageButton').addEventListener('click', () => {
  $('#newPageTitleInput').value = ''
  $('#newPageTitleInput').focus()

  showModal('#dialog-newPage')
})

$('#dialog-newPage-save').addEventListener('click', () => {
  newPage(false)
})

$('#newPageTitleInput').addEventListener('keyup', (event) => {
  if (event.key === 'Enter' || event.keyCode === 13) {
    $('#dialog-newPage-save').click()
  }
})

$('#renamePageTitleInput').addEventListener('keyup', (event) => {
  if (event.key === 'Enter' || event.keyCode === 13) {
    $('#dialog-renamePage-save').click()
  }
})

if (isElectron) {
  // Import calculations from file
  $('#importButton').addEventListener('click', numara.import)

  numara.importData((event, data, msg) => {
    newPage(true)

    cm.setValue(data)

    notify(msg, 'success')
  })

  numara.importDataError((event, error) => {
    notify(error, 'danger')
  })

  numara.main.import(numara.import)

  // Export calculations to file
  $('#exportButton').addEventListener('click', () => {
    numara.export($('#newPageTitleInput').value, cm.getValue())
  })

  numara.exportData((event, msg) => {
    notify(msg, 'success')
  })

  numara.exportDataError((event, error) => {
    notify(error, 'danger')
  })

  numara.main.export(() => {
    numara.export($('#newPageTitleInput').value, cm.getValue())
  })

  // Print window from main
  numara.main.print(() => {
    window.print()
  })

  // Log messages from main
  numara.logMessage((event, message) => {
    console.log(message)
  })
} else {
  $('#exportButton').remove()
  $('#importButton').remove()
}
