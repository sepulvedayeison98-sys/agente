import { redirect } from "next/navigation";
import { currentUser } from "@/lib/dal";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Se pregunta por la sesión vigente, no por la cookie: una cookie firmada
  // cuyo PIN ya cambió no debe rebotar a nadie al POS.
  const session = await currentUser();
  if (session) {
    redirect(session.role === "ADMINISTRADOR" ? "/admin/dashboard" : "/pos");
  }

  return <LoginForm />;
}
