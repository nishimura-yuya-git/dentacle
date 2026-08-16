type AppMetadata = Record<string, unknown>

export function mergeMustSetPasswordAppMetadata(
  existing: AppMetadata | null | undefined,
): AppMetadata {
  return {
    ...(existing ?? {}),
    must_set_password: true,
  }
}

export async function markInvitedUserMustSetPassword(input: {
  userId: string
  existingAppMetadata?: AppMetadata | null
  updateUserById: (
    userId: string,
    attributes: { app_metadata: AppMetadata },
  ) => Promise<{ error: { message: string } | null }>
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await input.updateUserById(input.userId, {
    app_metadata: mergeMustSetPasswordAppMetadata(input.existingAppMetadata),
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
