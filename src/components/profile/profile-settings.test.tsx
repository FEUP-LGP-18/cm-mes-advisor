import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ProfileSettings from "./profile-settings";

const BASE_PROFILE = {
  email: "owner@example.com",
  emailConfirmedAt: "2026-05-01T12:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Owner User",
};

describe("ProfileSettings", () => {
  it("renders account email as read-only and display name as editable", () => {
    const html = renderToStaticMarkup(
      <ProfileSettings initialProfile={BASE_PROFILE} onSaved={vi.fn()} />,
    );

    expect(html).toContain("Profile");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("readOnly");
    expect(html).toContain("Display name");
    expect(html).toContain("Save profile");
  });

  it("renders avatar initials from email", () => {
    const html = renderToStaticMarkup(
      <ProfileSettings initialProfile={BASE_PROFILE} onSaved={vi.fn()} />,
    );
    // OW from "owner" (no separator → first two chars)
    expect(html).toContain("OW");
  });

  it("renders color picker swatches", () => {
    const html = renderToStaticMarkup(
      <ProfileSettings initialProfile={BASE_PROFILE} onSaved={vi.fn()} />,
    );
    expect(html).toContain("Avatar color");
    expect(html).toContain("Select color");
  });

  it("renders display name from initialProfile in preview", () => {
    const html = renderToStaticMarkup(
      <ProfileSettings initialProfile={BASE_PROFILE} onSaved={vi.fn()} />,
    );
    expect(html).toContain("Owner User");
  });

  it("renders breadcrumb navigation", () => {
    const html = renderToStaticMarkup(
      <ProfileSettings initialProfile={BASE_PROFILE} onSaved={vi.fn()} />,
    );
    expect(html).toContain("Projects");
    expect(html).toContain("Profile");
  });
});
