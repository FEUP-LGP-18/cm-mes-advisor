import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/projects/permissions.server";
import { acceptInvite, getInviteDetails } from "@/lib/projects/invites.server";

function InvalidInvitationPanel({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Invalid Invitation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
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
    redirect(`/login?next=/invites/${token}`);
  }

  const detailsResult = await getInviteDetails(token);

  if (!detailsResult.ok) {
    return <InvalidInvitationPanel message={detailsResult.message} />;
  }

  if (
    !userResult.data.email ||
    detailsResult.data.email.toLowerCase() !== userResult.data.email.toLowerCase()
  ) {
    return <InvalidInvitationPanel message="This invite was sent to a different email address." />;
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
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          You&apos;re Invited!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You have been invited to join a project as a <strong>{detailsResult.data.role}</strong>.
        </p>
        
        {acceptError ? (
          <p className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {decodeURIComponent(acceptError)}
          </p>
        ) : null}

        <form action={handleAccept}>
          <button
            type="submit"
            className="w-full inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Accept Invitation
          </button>
        </form>
      </div>
    </div>
  );
}
