import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import {
  createCustomMenuCode,
  enabledMapFromMenus,
  ensureClinicVisitMenus,
  normalizeMenuName,
  parseDurationMinutes,
  type ClinicVisitMenu,
} from '@/utils/visitMenus/clinicVisitMenus'

type Options = {
  clinicId: string | undefined
  userId: string | undefined
  canEdit: boolean
}

/** 設定メニューの読込・登録・編集・削除・ON/OFF */
export function useVisitMenuSettings({ clinicId, userId, canEdit }: Options) {
  const toast = useToast()
  const [items, setItems] = useState<ClinicVisitMenu[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDuration, setNewDuration] = useState('15')
  const [addNameError, setAddNameError] = useState('')
  const [addDurationError, setAddDurationError] = useState('')
  const [editTarget, setEditTarget] = useState<ClinicVisitMenu | null>(null)
  const [editName, setEditName] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editNameError, setEditNameError] = useState('')
  const [editDurationError, setEditDurationError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ClinicVisitMenu | null>(null)

  const reload = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data: clinicRes, error: clinicError } = await supabase
      .from('clinics')
      .select('metadata')
      .eq('id', clinicId)
      .is('deleted_at', null)
      .maybeSingle()
    if (clinicError) {
      toast.error(clinicError.message)
      setLoading(false)
      return
    }
    const result = await ensureClinicVisitMenus({
      clinicId,
      metadata: (clinicRes?.metadata ?? null) as Json,
      userId: userId ?? null,
    })
    if (result.error) toast.error(result.error)
    setItems(result.items)
    setLoading(false)
  }, [clinicId, toast, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  function validateName(raw: string, excludeId?: string): string {
    const name = normalizeMenuName(raw)
    if (!name) return '名称を入力してください'
    const duplicated = items.some(
      (item) => item.id !== excludeId && item.name === name,
    )
    if (duplicated) return '同じ名称のメニューがあります'
    return ''
  }

  function validateDuration(raw: string): { error: string; value: number | null } {
    const value = parseDurationMinutes(raw)
    if (value == null) return { error: '所要は1〜480の整数で入力してください', value: null }
    return { error: '', value }
  }

  async function handleToggle(item: ClinicVisitMenu, next: boolean) {
    if (!clinicId || !canEdit) return
    const previous = items
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, isEnabled: next } : row)),
    )
    setSaving(true)
    const { error } = await supabase
      .from('clinic_visit_menus')
      .update({ is_enabled: next, updated_by: userId ?? null })
      .eq('id', item.id)
      .eq('clinic_id', clinicId)
    if (error) {
      setItems(previous)
      toast.error(error.message)
    }
    setSaving(false)
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!clinicId || !canEdit) return
    const nameError = validateName(newName)
    const duration = validateDuration(newDuration)
    setAddNameError(nameError)
    setAddDurationError(duration.error)
    if (nameError || duration.value == null) return
    setSaving(true)
    const maxOrder = items.reduce((max, item) => Math.max(max, item.sortOrder), -1)
    const { error } = await supabase.from('clinic_visit_menus').insert({
      clinic_id: clinicId,
      code: createCustomMenuCode(),
      name: normalizeMenuName(newName),
      duration_minutes: duration.value,
      is_enabled: true,
      sort_order: maxOrder + 1,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('メニューを追加しました')
      setNewName('')
      setNewDuration('15')
      await reload()
    }
    setSaving(false)
  }

  function openEdit(item: ClinicVisitMenu) {
    setEditTarget(item)
    setEditName(item.name)
    setEditDuration(String(item.durationMinutes))
    setEditNameError('')
    setEditDurationError('')
  }

  async function handleEdit() {
    if (!clinicId || !canEdit || !editTarget) return
    const nameError = validateName(editName, editTarget.id)
    const duration = validateDuration(editDuration)
    setEditNameError(nameError)
    setEditDurationError(duration.error)
    if (nameError || duration.value == null) return
    setSaving(true)
    const { error } = await supabase
      .from('clinic_visit_menus')
      .update({
        name: normalizeMenuName(editName),
        duration_minutes: duration.value,
        updated_by: userId ?? null,
      })
      .eq('id', editTarget.id)
      .eq('clinic_id', clinicId)
    if (error) toast.error(error.message)
    else {
      toast.success('メニューを保存しました')
      setEditTarget(null)
      await reload()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!clinicId || !canEdit || !deleteTarget) return
    setSaving(true)
    const { error } = await supabase
      .from('clinic_visit_menus')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId ?? null,
        updated_by: userId ?? null,
      })
      .eq('id', deleteTarget.id)
      .eq('clinic_id', clinicId)
    if (error) toast.error(error.message)
    else {
      toast.success('メニューを削除しました')
      setDeleteTarget(null)
      await reload()
    }
    setSaving(false)
  }

  return {
    items,
    enabled: enabledMapFromMenus(items),
    loading,
    saving,
    canEdit,
    newName,
    newDuration,
    addNameError,
    addDurationError,
    setNewName,
    setNewDuration,
    editTarget,
    editName,
    editDuration,
    editNameError,
    editDurationError,
    setEditName,
    setEditDuration,
    deleteTarget,
    handleToggle,
    handleAdd,
    openEdit,
    closeEdit: () => setEditTarget(null),
    handleEdit,
    openDelete: setDeleteTarget,
    closeDelete: () => setDeleteTarget(null),
    handleDelete,
  }
}
