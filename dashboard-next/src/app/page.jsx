import { redirect } from "next/navigation";

// Root → always send users to the inbox (middleware handles auth guard)
export default function RootPage() {
  redirect("/inbox");
}
