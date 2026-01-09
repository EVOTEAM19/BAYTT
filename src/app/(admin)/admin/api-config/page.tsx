import { redirect } from "next/navigation";

export default function AdminApiConfigPage() {
  // Redirigir a providers ya que ahí se gestiona todo
  redirect("/admin/providers");
}
