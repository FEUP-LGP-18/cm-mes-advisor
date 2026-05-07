import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/auth-shell";
import { requireUser } from "@/lib/projects/permissions.server";
import { acceptInvite, getInviteDetails } from "@/lib/projects/invites.server";

function InvalidInvitationPanel({ message }: { message: string }) {
  return (
    <AuthShell>
      <div className="w-full max-w-sm animate-enter">
        <div className="premium-panel rounded-3xl p-8 grid gap-6">
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
              Invitation unavailable
            </h1>
            <p className="text-sm leading-relaxed text-[color:var(--shell-muted)]">
              {message}
            </p>
          </div>
          <Link
            href="/"
            className="focus-premium theme-shell-button-secondary w-full rounded-2xl px-5 py-3 text-sm font-semibold text-center transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function formatInviteRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const token = (await params).token;
  const { error: acceptError } = await searchParams;
  const userResult = await requireUser();

  if (!userResult.ok) {
    redirect(`/login?next=${encodeURIComponent(`/invites/${token}`)}`);
  }

  const detailsResult = await getInviteDetails(token);

  if (!detailsResult.ok) {
    return <InvalidInvitationPanel message={detailsResult.message} />;
  }

  if (
    !userResult.data.email ||
    detailsResult.data.email.toLowerCase() !==
      userResult.data.email.toLowerCase()
  ) {
    return (
      <InvalidInvitationPanel message="This invite was sent to a different email address." />
    );
  }

  const handleAccept = async () => {
    "use server";
    const result = await acceptInvite(token);
    if (result.ok) {
      redirect(`/projects/${result.data.projectId}`);
    } else {
      redirect(`/invites/${token}?error=${encodeURIComponent(result.message)}`);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm animate-enter">
        <div className="premium-panel rounded-3xl p-8 grid gap-6">
          <div className="grid gap-2">
            <p className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]">
              Project invitation
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
              Join this project
            </h1>
            <p className="text-sm leading-relaxed text-[color:var(--shell-muted)]">
              You have been invited as{" "}
              <strong className="text-[color:var(--shell-ink)]">
                {formatInviteRole(detailsResult.data.role)}
              </strong>
              .
            </p>
          </div>

          {acceptError ? (
            <p
              role="alert"
              className="phase-feedback phase-feedback-error rounded-2xl text-sm"
            >
              {acceptError}
            </p>
          ) : null}

          <form action={handleAccept}>
            <button
              type="submit"
              className="focus-premium theme-button-primary w-full rounded-2xl px-5 py-3 text-sm font-semibold transition"
            >
              Accept Invitation
            </button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
