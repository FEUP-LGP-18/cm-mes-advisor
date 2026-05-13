export async function sendInviteEmail(email: string, inviteUrl: string) {
  // In a real application, this would use Resend, SendGrid, or similar.
  // For now, we log it to the console as a stub.
  console.log(`\n\n=== INVITATION EMAIL ===`);
  console.log(`To: ${email}`);
  console.log(`Subject: You have been invited to a project`);
  console.log(`Link: ${inviteUrl}`);
  console.log(`========================\n\n`);
}
