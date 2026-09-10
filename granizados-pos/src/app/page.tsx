import { redirect } from "next/navigation";
import { currentUser } from "@/lib/dal";

export default async function HomePage() {
  const session = await currentUser();
  if (!session) {
    redirect("/login");
  }
  redirect(session.role === "ADMINISTRADOR" ? "/admin/dashboard" : "/pos");
}
