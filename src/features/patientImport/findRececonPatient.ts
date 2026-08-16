import {
  matchRececonPatient,
  pickRececonPatientIdentity,
  type RececonPatientCandidate,
  type RececonPatientIdentity,
  type RececonPatientMatch,
} from '@/contracts/receconIdentity.contract'
import { supabase } from '@/lib/supabase'

type PatientIdentityRow = {
  id: string
  chart_number: string | null
  external_id: string | null
}

function toCandidate(row: PatientIdentityRow): RececonPatientCandidate {
  return {
    id: row.id,
    chartNumber: row.chart_number,
    externalId: row.external_id,
  }
}

async function loadByExternalId(
  clinicId: string,
  externalId: string,
): Promise<PatientIdentityRow | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, chart_number, external_id')
    .eq('clinic_id', clinicId)
    .eq('external_id', externalId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

async function loadByChartNumber(
  clinicId: string,
  chartNumber: string,
): Promise<PatientIdentityRow | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, chart_number, external_id')
    .eq('clinic_id', clinicId)
    .eq('chart_number', chartNumber)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function findRececonPatientMatch(
  clinicId: string,
  input: { chartNumber: string | null; externalId: string | null },
): Promise<RececonPatientMatch> {
  const identity: RececonPatientIdentity = pickRececonPatientIdentity({
    clinicId,
    chartNumber: input.chartNumber,
    externalId: input.externalId,
  })
  const existing: RececonPatientCandidate[] = []
  const seen = new Set<string>()

  const push = (row: PatientIdentityRow | null) => {
    if (!row || seen.has(row.id)) return
    seen.add(row.id)
    existing.push(toCandidate(row))
  }

  if (identity.externalId) {
    push(await loadByExternalId(clinicId, identity.externalId))
  }
  if (identity.chartNumber) {
    push(await loadByChartNumber(clinicId, identity.chartNumber))
  }

  return matchRececonPatient(identity, existing)
}
