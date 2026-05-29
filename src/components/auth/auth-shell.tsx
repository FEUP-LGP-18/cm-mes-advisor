"use client";

export default function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="fv-auth-bg">
      {children}
    </main>
  );
}
