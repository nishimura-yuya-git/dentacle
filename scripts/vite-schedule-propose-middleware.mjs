/**
 * Vite 開発サーバー用: POST /api/schedule/propose を Node で処理する。
 * Vercel の api/schedule/propose.ts と同じ runProposeJob を呼ぶ。
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function readBearer(req) {
  const header = req.headers.authorization
  if (!header || typeof header !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

export function scheduleProposeMiddleware() {
  return {
    name: 'dentacle-schedule-propose',
    configureServer(server) {
      const root = server.config.root || process.cwd()
      loadEnvFile(path.join(root, '.env'))
      loadEnvFile(path.join(root, '.env.local'))

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const isPropose = url === '/api/schedule/propose'
        const isGapFill = url === '/api/schedule/gap-fill'
        const isFeedback = url === '/api/feedback/send'
        const isAdminInvite = url === '/api/admins/invite'
        if (!isPropose && !isGapFill && !isFeedback && !isAdminInvite) {
          next()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: 'POST のみ対応しています' }))
          return
        }

        try {
          const accessToken = readBearer(req)
          if (!accessToken) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                ok: false,
                error: 'Authorization Bearer が必要です',
              }),
            )
            return
          }

          const body = await readJsonBody(req)
          let outcome
          if (isAdminInvite) {
            const originHeader = req.headers.origin
            const origin =
              typeof originHeader === 'string' && originHeader.trim()
                ? originHeader
                : undefined
            const mod = await server.ssrLoadModule(
              '/server/admins/invitePlatformAdmin.ts',
            )
            outcome = await mod.invitePlatformAdmin({
              accessToken,
              email: typeof body.email === 'string' ? body.email : '',
              origin,
            })
          } else if (isFeedback) {
            const mod = await server.ssrLoadModule(
              '/server/feedback/submitFeedbackWithEnv.ts',
            )
            outcome = await mod.submitFeedbackWithEnv({
              accessToken,
              body: typeof body.body === 'string' ? body.body : '',
              clinicId: typeof body.clinicId === 'string' ? body.clinicId : '',
              pagePath: typeof body.pagePath === 'string' ? body.pagePath : '',
              threadId: typeof body.threadId === 'string' ? body.threadId : '',
            })
          } else if (isGapFill) {
            const mod = await server.ssrLoadModule('/server/schedule/runGapFillJob.ts')
            outcome = await mod.runGapFillJob({
              accessToken,
              clinicId: typeof body.clinicId === 'string' ? body.clinicId : '',
              targetDate: typeof body.targetDate === 'string' ? body.targetDate : '',
              vehicleTeamIds: Array.isArray(body.vehicleTeamIds)
                ? body.vehicleTeamIds.filter((id) => typeof id === 'string')
                : [],
              teamId: typeof body.teamId === 'string' ? body.teamId : '',
              windowStart:
                typeof body.windowStart === 'string' ? body.windowStart : '',
              windowEnd: typeof body.windowEnd === 'string' ? body.windowEnd : '',
              userMessage:
                typeof body.userMessage === 'string' ? body.userMessage : '',
            })
          } else {
            const mod = await server.ssrLoadModule('/server/schedule/runProposeJob.ts')
            outcome = await mod.runProposeJob({
              accessToken,
              clinicId: typeof body.clinicId === 'string' ? body.clinicId : '',
              targetDate: typeof body.targetDate === 'string' ? body.targetDate : '',
              vehicleTeamIds: Array.isArray(body.vehicleTeamIds)
                ? body.vehicleTeamIds.filter((id) => typeof id === 'string')
                : [],
            })
          }

          const status = outcome.ok
            ? 200
            : outcome.code === 'unauthorized'
              ? 401
              : outcome.code === 'forbidden'
                ? 403
                : outcome.code === 'bad_request'
                  ? 400
                  : outcome.code === 'rate_limited'
                    ? 429
                    : outcome.code === 'empty'
                      ? 422
                      : outcome.code === 'not_configured'
                        ? 503
                        : 500

          if (outcome.code === 'rate_limited' && outcome.retryAfterSec) {
            res.setHeader('Retry-After', String(outcome.retryAfterSec))
          }
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(outcome))
        } catch (err) {
          console.error(
            '[vite-schedule-propose]',
            err instanceof Error ? err.message : err,
          )
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              ok: false,
              error: isAdminInvite
                ? '運営の招待に失敗しました'
                : isFeedback
                  ? 'ご意見の受付に失敗しました'
                  : isGapFill
                    ? '空き枠埋めの処理に失敗しました'
                    : '自動提案の処理に失敗しました',
            }),
          )
        }
      })
    },
  }
}
