/** ログイン後シェルをビューポートに固定し、最上部のオーバースクロールを止める */

export const APP_SHELL_ATTR = 'data-app-shell'

export const APP_SHELL_ROOT_CLASS = 'flex h-dvh overflow-hidden overscroll-none'

export const APP_SHELL_COLUMN_CLASS = 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'

export const APP_SHELL_SIDEBAR_CLASS = 'h-dvh min-h-0 overflow-hidden'

export function appShellMainClass(fillViewport: boolean): string {
  return fillViewport
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none'
    : 'min-h-0 flex-1 overflow-y-auto overscroll-none'
}
