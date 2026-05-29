type MesLogoTone = "color" | "white" | "black";

export default function MesLogo({
  className = "",
  tone = "color",
}: {
  className?: string;
  tone?: MesLogoTone;
}) {
  return (
    <span
      aria-label="MES Advisor for Industry 5.0"
      className={`mes-logo mes-logo-${tone}${className ? ` ${className}` : ""}`}
      role="img"
    />
  );
}
