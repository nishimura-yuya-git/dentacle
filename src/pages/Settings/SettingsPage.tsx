import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/useAuth'
import { ClinicAccessPlaceholder } from '@/features/clinic/ClinicAccessPlaceholder'
import { useClinic } from '@/features/clinic/useClinic'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import {
  readIntroductionLane,
  readVisitMenuEnabled,
  withIntroductionLane,
  withVisitMenuEnabled,
} from '@/utils/clinic/clinicMetadata'
import { VisitMenuSection } from '@/pages/Settings/sections/VisitMenuSection'
import {
  SETTINGS_TD,
  SettingsMasterPanel,
  SettingsTable,
} from '@/pages/Settings/SettingsMasterPanel'
import { IntroductionLaneSection } from '@/pages/Settings/sections/IntroductionLaneSection'
import { SettingsHubNav } from '@/pages/Settings/sections/SettingsHubNav'
import { type SettingsSection } from '@/pages/Settings/settingsHub'
import { WEEKDAY_LABELS } from '@/utils/roleLabels'
import {
  DEFAULT_INTRODUCTION_LANE,
  getProposalLanePreset,
  type IntroductionLane,
} from '@/utils/schedule/proposalLanePresets'

/** 患者一覧・自動提案の白1枚と同型。角丸カード・外枠・影は置かない。 */
const SETTINGS_ARTICLE_CLASS =
  '-mx-3 -my-2 flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 py-5 font-normal leading-[1.7] text-[16px] text-slate-900 md:-mx-4 md:-my-3 md:px-8 md:py-6'

type Team = { id: string; name: string; color: string | null; sort_order: number }
type Staff = { id: string; display_name: string; staff_type: string; external_code: string | null }
type Slot = {
  id: string
  team_id: string | null
  staff_id: string | null
  day_of_week: number | null
  start_time: string
  end_time: string
}

function staffTypeLabel(staffType: string): string {
  if (staffType === 'doctor') return '医師'
  if (staffType === 'dh') return 'DH'
  return 'その他'
}

function staffTypeBadgeClass(staffType: string): string {
  if (staffType === 'doctor') {
    return 'border-emerald-200 bg-emerald-50 text-[#008C01]'
  }
  if (staffType === 'dh') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  }
  return 'border-slate-200 bg-slate-50 text-slate-500'
}

export function SettingsPage() {
  const { user } = useAuth()
  const { clinic, canWriteOperations, isAdmin, clinicReady } = useClinic()
  const toast = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [lane, setLane] = useState<IntroductionLane>(DEFAULT_INTRODUCTION_LANE)
  const [laneSaving, setLaneSaving] = useState(false)
  const [menuEnabled, setMenuEnabled] = useState<Record<string, boolean>>({})
  const [menuSaving, setMenuSaving] = useState(false)
  const [section, setSection] = useState<SettingsSection>('lane')

  const [teamName, setTeamName] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffType, setStaffType] = useState('doctor')
  const [slotTeamId, setSlotTeamId] = useState('')
  const [slotDay, setSlotDay] = useState('1')
  const [slotStart, setSlotStart] = useState('09:00')
  const [slotEnd, setSlotEnd] = useState('17:00')

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const team of teams) map.set(team.id, team.name)
    return map
  }, [teams])

  const reload = useCallback(async () => {
    if (!clinic) return
    const [teamsRes, staffRes, slotsRes, clinicRes] = await Promise.all([
      supabase
        .from('teams')
        .select('id, name, color, sort_order')
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .order('sort_order'),
      supabase
        .from('staff_members')
        .select('id, display_name, staff_type, external_code')
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .order('display_name'),
      supabase
        .from('working_slots')
        .select('id, team_id, staff_id, day_of_week, start_time, end_time')
        .eq('clinic_id', clinic.id)
        .is('deleted_at', null)
        .order('day_of_week'),
      supabase
        .from('clinics')
        .select('metadata')
        .eq('id', clinic.id)
        .is('deleted_at', null)
        .maybeSingle(),
    ])
    if (teamsRes.error || staffRes.error || slotsRes.error || clinicRes.error) {
      toast.error(
        teamsRes.error?.message ||
          staffRes.error?.message ||
          slotsRes.error?.message ||
          clinicRes.error?.message ||
          '読込失敗',
      )
      return
    }
    setTeams(teamsRes.data ?? [])
    setStaff(staffRes.data ?? [])
    setSlots(slotsRes.data ?? [])
    setLane(readIntroductionLane(clinicRes.data?.metadata ?? null))
    setMenuEnabled(readVisitMenuEnabled(clinicRes.data?.metadata ?? null))
    if (!slotTeamId && teamsRes.data?.[0]) setSlotTeamId(teamsRes.data[0].id)
  }, [clinic, slotTeamId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!clinicReady) {
    return (
      <DashboardLayout title="設定">
        <ClinicAccessPlaceholder />
      </DashboardLayout>
    )
  }

  if (!clinic) {
    return (
      <DashboardLayout title="設定">
        <p className="text-sm text-slate-500">クリニックを選択または作成してください。</p>
      </DashboardLayout>
    )
  }

  async function addTeam(event: FormEvent) {
    event.preventDefault()
    if (!canWriteOperations) return
    const { error: insertError } = await supabase.from('teams').insert({
      clinic_id: clinic.id,
      name: teamName.trim(),
    })
    if (insertError) toast.error(insertError.message)
    else {
      toast.success('チームを追加しました')
      setTeamName('')
      await reload()
    }
  }

  async function addStaff(event: FormEvent) {
    event.preventDefault()
    if (!canWriteOperations) return
    const { error: insertError } = await supabase.from('staff_members').insert({
      clinic_id: clinic.id,
      display_name: staffName.trim(),
      staff_type: staffType,
    })
    if (insertError) toast.error(insertError.message)
    else {
      toast.success('担当者を追加しました')
      setStaffName('')
      await reload()
    }
  }

  async function addSlot(event: FormEvent) {
    event.preventDefault()
    if (!canWriteOperations) return
    const { error: insertError } = await supabase.from('working_slots').insert({
      clinic_id: clinic.id,
      team_id: slotTeamId || null,
      day_of_week: Number(slotDay),
      start_time: `${slotStart}:00`,
      end_time: `${slotEnd}:00`,
    })
    if (insertError) toast.error(insertError.message)
    else {
      toast.success('稼働枠を追加しました')
      await reload()
    }
  }

  async function handleLaneChange(next: IntroductionLane) {
    if (!clinic || !isAdmin) return
    setLane(next)
    setLaneSaving(true)
    try {
      const { data: current, error: readError } = await supabase
        .from('clinics')
        .select('metadata')
        .eq('id', clinic.id)
        .maybeSingle()
      if (readError) throw new Error(readError.message)

      const { error: updateError } = await supabase
        .from('clinics')
        .update({
          metadata: withIntroductionLane(current?.metadata ?? null, next) as Json,
          updated_by: user?.id ?? null,
        })
        .eq('id', clinic.id)
      if (updateError) throw new Error(updateError.message)
      toast.success(`導入タイプを「${getProposalLanePreset(next).label}」に保存しました`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '導入タイプの保存に失敗しました')
      await reload()
    } finally {
      setLaneSaving(false)
    }
  }

  async function handleMenuToggle(code: string, next: boolean) {
    if (!clinic || !canWriteOperations) return
    const nextEnabled = { ...menuEnabled, [code]: next }
    setMenuEnabled(nextEnabled)
    setMenuSaving(true)
    try {
      const { data: current, error: readError } = await supabase
        .from('clinics')
        .select('metadata')
        .eq('id', clinic.id)
        .maybeSingle()
      if (readError) throw new Error(readError.message)

      const { error: updateError } = await supabase
        .from('clinics')
        .update({
          metadata: withVisitMenuEnabled(current?.metadata ?? null, nextEnabled) as Json,
          updated_by: user?.id ?? null,
        })
        .eq('id', clinic.id)
      if (updateError) throw new Error(updateError.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'メニュー設定の保存に失敗しました')
      await reload()
    } finally {
      setMenuSaving(false)
    }
  }

  return (
    <DashboardLayout
      title="設定"
      fillViewport
      actions={<SettingsHubNav section={section} onSelect={setSection} />}
    >
      <article className={SETTINGS_ARTICLE_CLASS}>
        {section === 'lane' ? (
          <IntroductionLaneSection
            lane={lane}
            canEdit={isAdmin}
            saving={laneSaving}
            onChange={(next) => void handleLaneChange(next)}
          />
        ) : null}

        {section === 'menus' ? (
          <VisitMenuSection
            enabled={menuEnabled}
            canEdit={canWriteOperations}
            saving={menuSaving}
            onToggle={(code, next) => void handleMenuToggle(code, next)}
          />
        ) : null}

        {section === 'teams' ? (
          <SettingsMasterPanel
            title="チーム"
            count={teams.length}
            empty={teams.length === 0}
            emptyMessage="まだチームがありません。下のフォームから訪問号車などを追加してください。"
            footer={
              canWriteOperations ? (
                <form onSubmit={addTeam} className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="チーム名"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      className="!px-3 !py-2"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="!px-4 !py-2 !text-sm">
                      追加
                    </Button>
                  </div>
                </form>
              ) : null
            }
          >
            <SettingsTable headers={['チーム名']}>
              {teams.map((team, index) => (
                <tr
                  key={team.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                >
                  <td className={`${SETTINGS_TD} font-bold text-slate-900`}>
                    {team.name}
                  </td>
                </tr>
              ))}
            </SettingsTable>
          </SettingsMasterPanel>
        ) : null}

        {section === 'staff' ? (
          <SettingsMasterPanel
            title="担当者"
            count={staff.length}
            empty={staff.length === 0}
            emptyMessage="まだ担当者がありません。氏名と種別を入力して追加してください。"
            footer={
              canWriteOperations ? (
                <form
                  onSubmit={addStaff}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem_auto]"
                >
                  <Input
                    label="氏名"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    required
                    className="!px-3 !py-2"
                  />
                  <Select
                    label="種別"
                    labelTone="muted"
                    size="sm"
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value)}
                    options={[
                      { value: 'doctor', label: '医師' },
                      { value: 'dh', label: 'DH' },
                      { value: 'other', label: 'その他' },
                    ]}
                  />
                  <div className="flex items-end">
                    <Button type="submit" className="w-full !px-4 !py-2 !text-sm sm:w-auto">
                      追加
                    </Button>
                  </div>
                </form>
              ) : null
            }
          >
            <SettingsTable headers={['氏名', '種別']}>
              {staff.map((person, index) => (
                <tr
                  key={person.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                >
                  <td className={`${SETTINGS_TD} font-bold text-slate-900`}>
                    {person.display_name}
                  </td>
                  <td className={SETTINGS_TD}>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${staffTypeBadgeClass(person.staff_type)}`}
                    >
                      {staffTypeLabel(person.staff_type)}
                    </span>
                  </td>
                </tr>
              ))}
            </SettingsTable>
          </SettingsMasterPanel>
        ) : null}

        {section === 'slots' ? (
          <SettingsMasterPanel
            title="稼働枠"
            count={slots.length}
            empty={slots.length === 0}
            emptyMessage="まだ稼働枠がありません。チーム・曜日・時間を指定して追加してください。"
            footer={
              canWriteOperations ? (
                <form onSubmit={addSlot} className="grid grid-cols-2 gap-2 md:max-w-xl">
                  <Select
                    label="チーム"
                    labelTone="muted"
                    size="sm"
                    value={slotTeamId}
                    onChange={(e) => setSlotTeamId(e.target.value)}
                    options={[
                      { value: '', label: '未指定' },
                      ...teams.map((team) => ({ value: team.id, label: team.name })),
                    ]}
                  />
                  <Select
                    label="曜日"
                    labelTone="muted"
                    size="sm"
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    options={WEEKDAY_LABELS.map((label, index) => ({
                      value: String(index),
                      label: `${label}曜`,
                    }))}
                  />
                  <TimePicker
                    label="開始"
                    size="sm"
                    value={slotStart}
                    onChange={setSlotStart}
                    minuteStep={5}
                  />
                  <TimePicker
                    label="終了"
                    size="sm"
                    value={slotEnd}
                    onChange={setSlotEnd}
                    minuteStep={5}
                  />
                  <div className="col-span-2">
                    <Button type="submit" className="w-full !px-4 !py-2 !text-sm md:w-auto">
                      稼働枠を追加
                    </Button>
                  </div>
                </form>
              ) : null
            }
          >
            <SettingsTable headers={['チーム', '曜日', '時間']}>
              {slots.map((slot, index) => (
                <tr
                  key={slot.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}
                >
                  <td className={`${SETTINGS_TD} font-medium text-slate-800`}>
                    {slot.team_id
                      ? (teamNameById.get(slot.team_id) ?? '（不明）')
                      : '未指定'}
                  </td>
                  <td className={`${SETTINGS_TD} whitespace-nowrap`}>
                    {slot.day_of_week != null
                      ? `${WEEKDAY_LABELS[slot.day_of_week]}曜`
                      : '日付指定'}
                  </td>
                  <td className={`${SETTINGS_TD} whitespace-nowrap tabular-nums text-slate-700`}>
                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                  </td>
                </tr>
              ))}
            </SettingsTable>
          </SettingsMasterPanel>
        ) : null}
      </article>
    </DashboardLayout>
  )
}
