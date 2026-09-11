import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/authentication/auth";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="cosmos min-h-dvh p-5 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← Back to Neurai
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0c1020]/90 p-7 shadow-2xl">
          <h1 className="text-2xl font-semibold">Account</h1>

          <p className="mt-2 text-sm text-slate-400">
            Manage your Neurai account.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Name
              </p>
              <p className="mt-1 text-base text-slate-200">
                {session.user.name || "Not set"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Email
              </p>
              <p className="mt-1 text-base text-slate-200">
                {session.user.email}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Account status
              </p>
              <p className="mt-1 text-sm text-emerald-400">
                Active
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <Link
              href="/api/auth/signout"
              className="inline-block rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-500/20"
            >
              Sign out
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
