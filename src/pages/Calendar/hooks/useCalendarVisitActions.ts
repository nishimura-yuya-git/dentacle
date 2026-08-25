import type { FormEvent } from 'react'
import { ensurePhoneConfirmationForVisit } from '@/features/calendar/ensurePhoneConfirmation'
import { writeOperationTrace } from '@/features/calendar/writeOperationTrace'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import type { VisitCreateForm } from '@/pages/Calendar/components/VisitCreateModal'
import {
  createVisitRegisteredMessage,
  resolveCreateVisitStatus,
} from '@/pages/Calendar/utils/visitCreateBooking'
import type { CalendarBlock } from '@/pages/Calendar/components/dayVisitGrid.types'
import { minutesToLabel } from '@/pages/Calendar/utils/calendarGrid'
import {
  DEFAULT_VISIT_CELL_COLOR,
  withVisitCellColor,
  type VisitCellColor,
} from '@/utils/visitMenus/visitCellColor'
import { VISIT_MENU_CATALOG, type VisitMenuItem } from '@/utils/visitMenus/visitMenuCatalog'
import {
  buildVisitMenuSnapshots,
  resolveManualVisitEndTime,
  withVisitMenus,
  type VisitMenuForm,
} from '@/utils/visitMenus/visitMenuState'
import type {
  LoadOptions,
  VisitLocalPatch,
  VisitRow,
} from '@/pages/Calendar/hooks/useCalendarDayData'

export type VisitActionCtx = {
  clinicId: string
  userId: string
  date: string
  canWrite: boolean
  setBusy: (v: boolean) => void
  setError: (v: string | null) => void
  setMessage: (v: string | null) => void
  reload: (options?: LoadOptions) => Promise<void>
  patchVisitLocal?: (visitId: string, patch: VisitLocalPatch) => void
  patchVisitsLocal?: (visitIds: string[], patch: VisitLocalPatch) => void
  removeVisitsLocal?: (visitIds: string[]) => void
  visitMenuCatalog?: readonly VisitMenuItem[]
}

export async function createVisitOrBlock(
  ctx: VisitActionCtx,
  form: VisitCreateForm,
  defaultStartEnd: { start: string; end: string },
): Promise<boolean> {
  ctx.setBusy(true)
  ctx.setMessage(null)
  ctx.setError(null)

  if (form.mode === 'block') {
    const { error } = await supabase.from('calendar_blocks').insert({
      clinic_id: ctx.clinicId,
      team_id: form.team_id || null,
      scheduled_date: ctx.date,
      start_time: form.start_time,
      end_time: form.end_time,
      block_type: form.block_type,
      title: form.block_title.trim(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    ctx.setBusy(false)
    if (error) {
      ctx.setError(error.message)
      return false
    }
    void writeOperationTrace({
      clinicId: ctx.clinicId,
      userId: ctx.userId,
      action: 'calendar_block.create',
      entityType: 'calendar_block',
      payload: { date: ctx.date, blockType: form.block_type },
    })
    ctx.setMessage('空きブロックを登録しました')
    await ctx.reload()
    return true
  }

  if (!form.patient_id || !form.team_id) {
    ctx.setBusy(false)
    ctx.setError('患者と号車を選択してください')
    return false
  }

  let endTime = form.end_time
  if (form.menu_1) {
    endTime = resolveManualVisitEndTime(
      form,
      form.end_time,
      ctx.visitMenuCatalog ?? VISIT_MENU_CATALOG,
    )
  } else {
    const { data: condition } = await supabase
      .from('patient_visit_conditions')
      .select('standard_duration_minutes')
      .eq('clinic_id', ctx.clinicId)
      .eq('patient_id', form.patient_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (
      condition?.standard_duration_minutes &&
      form.start_time === defaultStartEnd.start &&
      form.end_time === defaultStartEnd.end
    ) {
      const start =
        Number(form.start_time.slice(0, 2)) * 60 + Number(form.start_time.slice(3, 5))
      endTime = minutesToLabel(start + condition.standard_duration_minutes)
    }
  }

  const bookingStatus = resolveCreateVisitStatus(form.booking_status)

  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      clinic_id: ctx.clinicId,
      patient_id: form.patient_id,
      team_id: form.team_id,
      staff_id: form.staff_id || null,
      scheduled_date: ctx.date,
      start_time: form.start_time,
      end_time: endTime,
      status: bookingStatus,
      source: 'manual',
      metadata: withVisitCellColor(
        withVisitMenus(
          null,
          buildVisitMenuSnapshots(form, ctx.visitMenuCatalog ?? VISIT_MENU_CATALOG),
        ),
        form.cell_color,
      ) as Json,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error || !visit) {
    ctx.setBusy(false)
    ctx.setError(error?.message ?? '登録に失敗しました')
    return false
  }

  try {
    await ensurePhoneConfirmationForVisit({
      clinicId: ctx.clinicId,
      visitId: visit.id,
      patientId: form.patient_id,
      userId: ctx.userId,
    })
    if (bookingStatus === 'confirmed') {
      const now = new Date().toISOString()
      const { error: phoneError } = await supabase
        .from('visit_phone_confirmations')
        .update({
          status: 'ok',
          contacted_at: now,
          contacted_by: ctx.userId,
          updated_by: ctx.userId,
          updated_at: now,
        })
        .eq('visit_id', visit.id)
        .eq('clinic_id', ctx.clinicId)
        .eq('status', 'pending')
        .is('deleted_at', null)
      if (phoneError) throw new Error(phoneError.message)
    }
  } catch (err) {
    ctx.setBusy(false)
    ctx.setError(err instanceof Error ? err.message : '電話確認の作成に失敗しました')
    return false
  }

  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.create_manual',
    entityType: 'visit',
    entityId: visit.id,
    payload: { date: ctx.date, teamId: form.team_id, status: bookingStatus },
  })
  ctx.setBusy(false)
  ctx.setMessage(createVisitRegisteredMessage(bookingStatus))
  await ctx.reload()
  return true
}

/**
 * 空き枠埋めの採用: 自動提案と同じ source で仮予約を1件作成する。
 */
export async function createTentativeAutoProposal(
  ctx: VisitActionCtx,
  input: {
    patientId: string
    teamId: string
    startTime: string
    endTime: string
  },
): Promise<boolean> {
  if (!ctx.canWrite) {
    ctx.setError('登録する権限がありません')
    return false
  }
  if (!input.patientId || !input.teamId) {
    ctx.setError('患者と号車が必要です')
    return false
  }

  ctx.setBusy(true)
  ctx.setError(null)
  ctx.setMessage(null)

  const startTime = input.startTime.slice(0, 5)
  const endTime = input.endTime.slice(0, 5)

  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      clinic_id: ctx.clinicId,
      patient_id: input.patientId,
      team_id: input.teamId,
      staff_id: null,
      scheduled_date: ctx.date,
      start_time: startTime,
      end_time: endTime,
      status: 'tentative',
      source: 'auto_proposal',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error || !visit) {
    ctx.setBusy(false)
    ctx.setError(error?.message ?? '仮予約の登録に失敗しました')
    return false
  }

  try {
    await ensurePhoneConfirmationForVisit({
      clinicId: ctx.clinicId,
      visitId: visit.id,
      patientId: input.patientId,
      userId: ctx.userId,
    })
  } catch (err) {
    ctx.setBusy(false)
    ctx.setError(err instanceof Error ? err.message : '電話確認の作成に失敗しました')
    return false
  }

  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.create_auto_proposal_gap_fill',
    entityType: 'visit',
    entityId: visit.id,
    payload: { date: ctx.date, teamId: input.teamId },
  })
  ctx.setBusy(false)
  ctx.setMessage('空き枠に仮予約を登録しました')
  await ctx.reload()
  return true
}

/** 仮予約を本予約へ確定する（電話確認キューがあれば OK に同期）。呼び出し元は詳細の確定ボタン */
export async function confirmTentativeVisit(
  ctx: VisitActionCtx,
  visitId: string,
): Promise<boolean> {
  if (!ctx.canWrite) {
    ctx.setError('確定する権限がありません')
    return false
  }
  ctx.setError(null)

  /** クリック直後に見た目を本予約へ（全件 reload 待ちのラグを避ける） */
  ctx.patchVisitLocal?.(visitId, { status: 'confirmed' })

  const now = new Date().toISOString()
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .update({
      status: 'confirmed',
      updated_by: ctx.userId,
      updated_at: now,
    })
    .eq('id', visitId)
    .eq('clinic_id', ctx.clinicId)
    .eq('status', 'tentative')
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (visitError || !visit) {
    await ctx.reload({ silent: true })
    ctx.setError(
      visitError?.message ?? '仮予約が見つからないか、すでに確定済みです',
    )
    return false
  }

  ctx.setMessage('本予約に確定しました')

  /** 電話確認同期・操作ログは背面で（UI待ちにしない） */
  void (async () => {
    const { error: phoneError } = await supabase
      .from('visit_phone_confirmations')
      .update({
        status: 'ok',
        contacted_at: now,
        contacted_by: ctx.userId,
        updated_by: ctx.userId,
        updated_at: now,
      })
      .eq('visit_id', visitId)
      .eq('clinic_id', ctx.clinicId)
      .eq('status', 'pending')
      .is('deleted_at', null)
    if (phoneError) {
      ctx.setError(phoneError.message)
    }
    void writeOperationTrace({
      clinicId: ctx.clinicId,
      userId: ctx.userId,
      action: 'visit.confirm_from_calendar',
      entityType: 'visit',
      entityId: visitId,
      payload: { date: ctx.date },
    })
  })()

  return true
}

export async function updateVisitDetail(
  ctx: VisitActionCtx,
  visitId: string,
  patch: {
    teamId: string
    startTime: string
    endTime: string
    menus: VisitMenuForm
    cellColor: VisitCellColor
    staffId?: string
    currentMetadata?: Json | null
  },
): Promise<boolean> {
  ctx.setBusy(true)
  const { error } = await supabase
    .from('visits')
    .update({
      team_id: patch.teamId || null,
      ...(patch.staffId !== undefined ? { staff_id: patch.staffId || null } : {}),
      start_time: patch.startTime,
      end_time: patch.endTime,
      metadata: withVisitCellColor(
        withVisitMenus(
          patch.currentMetadata ?? null,
          buildVisitMenuSnapshots(
            patch.menus,
            ctx.visitMenuCatalog ?? VISIT_MENU_CATALOG,
          ),
        ),
        patch.cellColor ?? DEFAULT_VISIT_CELL_COLOR,
      ) as Json,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', visitId)
    .eq('clinic_id', ctx.clinicId)
  ctx.setBusy(false)
  if (error) {
    ctx.setError(error.message)
    return false
  }
  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.update',
    entityType: 'visit',
    entityId: visitId,
  })
  ctx.setMessage('訪問を更新しました')
  await ctx.reload()
  return true
}

export async function cancelVisit(ctx: VisitActionCtx, visitId: string): Promise<boolean> {
  ctx.setBusy(true)
  const { error } = await supabase
    .from('visits')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: ctx.userId,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', visitId)
    .eq('clinic_id', ctx.clinicId)
  ctx.setBusy(false)
  if (error) {
    ctx.setError(error.message)
    return false
  }
  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.cancel',
    entityType: 'visit',
    entityId: visitId,
  })
  ctx.setMessage('訪問を取消しました')
  await ctx.reload()
  return true
}

export async function duplicateVisitAfter(
  ctx: VisitActionCtx,
  source: VisitRow,
  detail: { teamId: string; startTime: string; endTime: string },
): Promise<boolean> {
  ctx.setBusy(true)
  const start =
    Number(detail.endTime.slice(0, 2)) * 60 + Number(detail.endTime.slice(3, 5))
  const duration =
    start -
    (Number(detail.startTime.slice(0, 2)) * 60 +
      Number(detail.startTime.slice(3, 5)))
  const nextStart = minutesToLabel(start)
  const nextEnd = minutesToLabel(start + Math.max(duration, 15))
  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      clinic_id: ctx.clinicId,
      patient_id: source.patient_id,
      team_id: detail.teamId || source.team_id,
      staff_id: source.staff_id,
      scheduled_date: ctx.date,
      start_time: nextStart,
      end_time: nextEnd,
      status: 'tentative',
      source: 'manual',
      metadata: source.metadata ?? {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('id')
    .single()
  if (error || !visit) {
    ctx.setBusy(false)
    ctx.setError(error?.message ?? '複製に失敗しました')
    return false
  }
  try {
    await ensurePhoneConfirmationForVisit({
      clinicId: ctx.clinicId,
      visitId: visit.id,
      patientId: source.patient_id,
      userId: ctx.userId,
    })
  } catch (err) {
    ctx.setBusy(false)
    ctx.setError(err instanceof Error ? err.message : '電話確認の作成に失敗しました')
    return false
  }
  ctx.setBusy(false)
  ctx.setMessage('連続登録として複製し、電話確認キューに追加しました')
  await ctx.reload()
  return true
}

export async function persistMoveVisit(
  ctx: VisitActionCtx,
  visitId: string,
  teamId: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  if (!ctx.canWrite) return
  /** ドロップ直後に枠が元位置へ戻らないよう先にローカル反映 */
  ctx.patchVisitLocal?.(visitId, {
    team_id: teamId,
    start_time: startTime,
    end_time: endTime,
  })
  const { error } = await supabase
    .from('visits')
    .update({
      team_id: teamId,
      start_time: startTime,
      end_time: endTime,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', visitId)
    .eq('clinic_id', ctx.clinicId)
  if (error) {
    ctx.setError(error.message)
    await ctx.reload()
    return
  }
  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.move',
    entityType: 'visit',
    entityId: visitId,
    payload: { teamId, startTime, endTime },
  })
  await ctx.reload({ silent: true })
}

export async function persistResizeVisit(
  ctx: VisitActionCtx,
  visitId: string,
  endTime: string,
): Promise<void> {
  if (!ctx.canWrite) return
  ctx.patchVisitLocal?.(visitId, { end_time: endTime })
  const { error } = await supabase
    .from('visits')
    .update({
      end_time: endTime,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', visitId)
    .eq('clinic_id', ctx.clinicId)
  if (error) {
    ctx.setError(error.message)
    await ctx.reload()
    return
  }
  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.resize',
    entityType: 'visit',
    entityId: visitId,
    payload: { endTime },
  })
  await ctx.reload({ silent: true })
}

/**
 * 当日の自動提案仮予約を一括で本予約確定する。
 * @returns 確定件数
 */
export async function confirmAutoProposalTentatives(ctx: VisitActionCtx): Promise<number> {
  if (!ctx.canWrite) {
    ctx.setError('確定する権限がありません')
    return 0
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('visits')
    .update({
      status: 'confirmed',
      updated_by: ctx.userId,
      updated_at: now,
    })
    .eq('clinic_id', ctx.clinicId)
    .eq('scheduled_date', ctx.date)
    .eq('source', 'auto_proposal')
    .eq('status', 'tentative')
    .is('deleted_at', null)
    .select('id')

  if (error) {
    await ctx.reload({ silent: true })
    ctx.setError(error.message)
    return 0
  }

  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return 0

  ctx.patchVisitsLocal?.(ids, { status: 'confirmed' })

  void (async () => {
    const { error: phoneError } = await supabase
      .from('visit_phone_confirmations')
      .update({
        status: 'ok',
        contacted_at: now,
        contacted_by: ctx.userId,
        updated_by: ctx.userId,
        updated_at: now,
      })
      .in('visit_id', ids)
      .eq('clinic_id', ctx.clinicId)
      .eq('status', 'pending')
      .is('deleted_at', null)
    if (phoneError) {
      ctx.setError(phoneError.message)
    }
    void writeOperationTrace({
      clinicId: ctx.clinicId,
      userId: ctx.userId,
      action: 'visit.confirm_auto_proposals',
      entityType: 'visit',
      payload: { date: ctx.date, count: ids.length },
    })
  })()

  return ids.length
}

/**
 * 当日の自動提案仮予約を一括取消（キャンセルリストに残す）。
 * @returns 取消件数
 */
export async function clearAutoProposalTentatives(ctx: VisitActionCtx): Promise<number> {
  if (!ctx.canWrite) {
    ctx.setError('クリアする権限がありません')
    return 0
  }
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('visits')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: ctx.userId,
      updated_by: ctx.userId,
      updated_at: now,
    })
    .eq('clinic_id', ctx.clinicId)
    .eq('scheduled_date', ctx.date)
    .eq('source', 'auto_proposal')
    .eq('status', 'tentative')
    .is('deleted_at', null)
    .select('id')

  if (error) {
    ctx.setError(error.message)
    return 0
  }

  const ids = (data ?? []).map((row) => row.id)
  ctx.removeVisitsLocal?.(ids)
  void writeOperationTrace({
    clinicId: ctx.clinicId,
    userId: ctx.userId,
    action: 'visit.clear_auto_proposals',
    entityType: 'visit',
    payload: { date: ctx.date, count: ids.length },
  })
  await ctx.reload({ silent: true })
  return ids.length
}

export async function softDeleteBlock(ctx: VisitActionCtx, block: CalendarBlock): Promise<void> {
  if (!ctx.canWrite) return
  if (!window.confirm('この空きブロックを削除しますか？')) return
  const { error } = await supabase
    .from('calendar_blocks')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq('id', block.id)
    .eq('clinic_id', ctx.clinicId)
  if (error) {
    ctx.setError(error.message)
    return
  }
  ctx.setMessage('空きブロックを削除しました')
  await ctx.reload()
}

export async function saveDayMemo(ctx: VisitActionCtx, body: string): Promise<boolean> {
  if (!ctx.canWrite) return false
  const { data: existing } = await supabase
    .from('clinic_day_memos')
    .select('id')
    .eq('clinic_id', ctx.clinicId)
    .eq('memo_date', ctx.date)
    .is('deleted_at', null)
    .maybeSingle()

  const error = existing?.id
    ? (
        await supabase
          .from('clinic_day_memos')
          .update({
            body,
            updated_by: ctx.userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      ).error
    : (
        await supabase.from('clinic_day_memos').insert({
          clinic_id: ctx.clinicId,
          memo_date: ctx.date,
          body,
          created_by: ctx.userId,
          updated_by: ctx.userId,
        })
      ).error

  if (error) {
    ctx.setError(error.message)
    return false
  }
  ctx.setMessage('日別メモを保存しました')
  return true
}

/** FormEvent を握りつぶす薄いラッパ（ページ側の冗長 async を減らす） */
export function asSubmit(handler: () => Promise<void>) {
  return (event: FormEvent) => {
    event.preventDefault()
    void handler()
  }
}
