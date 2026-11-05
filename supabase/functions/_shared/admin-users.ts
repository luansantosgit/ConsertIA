// ============================================================
// Gestao de usuarios admin para edges do superadmin
// (wizard-finalize, renew-user-password, superadmin-create-company)
// ============================================================

/** Localiza o usuario no Auth pelo e-mail (listUsers paginado). */
export async function findAuthUserByEmail(admin: any, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = (data?.users ?? []).find(
    (u: { email?: string }) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
  );
  return match ?? null;
}

/** Garante a linha do perfil em `users` (o finalizeOnboarding so cria se nao existir). */
export async function ensureUserProfile(
  admin: any,
  userId: string,
  email: string,
  tenantId: string,
  name: string,
) {
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  await admin.from("users").insert({
    id: userId,
    tenant_id: tenantId,
    email,
    name,
    role: "admin",
    active: true,
    permissions: [],
  });
}

/**
 * Sincroniza o user_metadata do auth user com o tenant finalizado.
 *
 * O lead que comecou o wizard e desistiu fica com um auth user cujo
 * `user_metadata.tenant_id` aponta para um tenant que pode nunca mais
 * existir. As policies RLS (users, push_subscriptions etc.) usam esse
 * claim, entao o login negaria o proprio perfil ("Perfil de usuario
 * nao encontrado"). Reutilizar o usuario exige realinhar os metadados.
 *
 * Superadmin nunca e demovido: ele tem bypass de RLS por role e pode
 * estar sendo apenas reusado como e-mail de contato.
 */
export async function syncAdminMetadata(
  admin: any,
  userId: string,
  tenantId: string,
  fallbackName: string,
) {
  const { data: fetched } = await admin.auth.admin.getUserById(userId);
  const meta = fetched?.user?.user_metadata ?? {};
  if (meta.role === "superadmin" || meta.tenant_id === tenantId) return;

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      email_verified: true,
      tenant_id: tenantId,
      role: "admin",
      name: meta.name || fallbackName,
    },
  });
  if (error) throw new Error(`metadata_sync_failed: ${error.message}`);
}
