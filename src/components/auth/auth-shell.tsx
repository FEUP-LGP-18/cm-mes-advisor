"use client";

export default function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fv-auth-bg">
      {children}
    </div>
  );
}
