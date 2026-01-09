import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminProviderFormClient } from "./admin-provider-form-client";

export default async function AdminProviderNewPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <AdminProviderFormClient
      provider={null}
      defaultType={searchParams.type || undefined}
    />
  );
}
