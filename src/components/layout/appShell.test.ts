import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  APP_SHELL_ATTR,
  APP_SHELL_COLUMN_CLASS,
  APP_SHELL_ROOT_CLASS,
  APP_SHELL_SIDEBAR_CLASS,
  appShellMainClass,
} from './appShell.ts'

const here = dirname(fileURLToPath(import.meta.url))

function readLayout(name: string): string {
  return readFileSync(join(here, name), 'utf8')
}

describe('アプリシェルの最上部固定', () => {
  it('ルートはビューポート高に固定し、オーバースクロールしない', () => {
    assert.match(APP_SHELL_ROOT_CLASS, /\bh-dvh\b/)
    assert.match(APP_SHELL_ROOT_CLASS, /\boverflow-hidden\b/)
    assert.match(APP_SHELL_ROOT_CLASS, /\boverscroll-none\b/)
    assert.equal(/\bmin-h-screen\b/.test(APP_SHELL_ROOT_CLASS), false)
    assert.equal(/\bmin-h-dvh\b/.test(APP_SHELL_ROOT_CLASS), false)
  })

  it('fillViewport でない本文だけが縦スクロールする', () => {
    const scrolling = appShellMainClass(false)
    const locked = appShellMainClass(true)
    assert.match(scrolling, /\boverflow-y-auto\b/)
    assert.match(scrolling, /\boverscroll-none\b/)
    assert.match(locked, /\boverflow-hidden\b/)
    assert.equal(/\boverflow-y-auto\b/.test(locked), false)
  })

  it('業務枠と文書シェルが固定クラスを使う', () => {
    const dashboard = readLayout('DashboardLayout.tsx')
    const sidebar = readLayout('AppSidebar.tsx')
    const security = readLayout('SecurityLayout.tsx')

    assert.match(dashboard, /APP_SHELL_ROOT_CLASS/)
    assert.match(dashboard, /APP_SHELL_COLUMN_CLASS/)
    assert.match(dashboard, /appShellMainClass/)
    assert.match(dashboard, /APP_SHELL_ATTR/)
    assert.equal(/\bmin-h-screen\b/.test(dashboard), false)

    assert.match(sidebar, /APP_SHELL_SIDEBAR_CLASS/)

    assert.match(security, /APP_SHELL_ROOT_CLASS/)
    assert.match(security, /APP_SHELL_COLUMN_CLASS/)
    assert.match(security, /appShellMainClass/)
    assert.match(security, /APP_SHELL_ATTR/)
    assert.equal(/\bmin-h-dvh\b/.test(security), false)
  })

  it('属性名は CSS の :has セレクタと一致する', () => {
    assert.equal(APP_SHELL_ATTR, 'data-app-shell')
  })

  it('html はオーバースクロールせず、シェル表示中は body も固定する', () => {
    const css = readFileSync(join(here, '../../index.css'), 'utf8')
    assert.match(css, /overscroll-behavior:\s*none/)
    assert.match(css, /html:has\(\[data-app-shell\]\)/)
    assert.match(css, /body:has\(\[data-app-shell\]\)/)
    assert.match(css, /overflow:\s*hidden/)
  })

  it('右カラムは縮み、サイドバーはビューポートを超えて伸びない', () => {
    assert.match(APP_SHELL_COLUMN_CLASS, /\bmin-h-0\b/)
    assert.match(APP_SHELL_COLUMN_CLASS, /\boverflow-hidden\b/)
    assert.match(APP_SHELL_SIDEBAR_CLASS, /\bh-dvh\b/)
    assert.match(APP_SHELL_SIDEBAR_CLASS, /\bmin-h-0\b/)
  })
})
