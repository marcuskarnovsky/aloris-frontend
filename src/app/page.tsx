import { redirect } from "next/navigation";

export default function RootPage() {
  // Leite auf das Dashboard. Die Middleware entscheidet dann,
  // ob der User eingeloggt ist oder zum Login muss.
  redirect("/dashboard");
}