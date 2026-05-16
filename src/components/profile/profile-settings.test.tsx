import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ProfileSettings from "./profile-settings";

describe("ProfileSettings", () => {
  it("renders account email as read-only and display name as editable", () => {
    const html = renderToStaticMarkup(
      <ProfileSettings
        initialProfile={{
          email: "owner@example.com",
          emailConfirmedAt: "2026-05-01T12:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          name: "Owner User",
        }}
        onSaved={vi.fn()}
      />,
    );

    expect(html).toContain("Profile");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("readOnly");
    expect(html).toContain("Display name");
    expect(html).toContain("Save profile");
  });
});
