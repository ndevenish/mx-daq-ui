import { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "react-query";
import { it, describe, vi, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { CollectionSetupJf } from "./CollectionSetupJf";
import { JungfrauRotationProvider } from "#/context/jungfrau/JungfrauRotationProvider";
import { VisitContext } from "#/context/VisitContext";

/** The form polls blueapi through its run button; none of that is under test here.
 *
 * The plan has to be in the list, the detector connected and the worker idle, or the
 * button is disabled for reasons of its own and any assertion that it is disabled
 * proves nothing.
 */
function stubBlueapi() {
  const plans = {
    plans: [{ name: "gui_run_jf_rotation_scan", schema: { properties: {} } }],
  };
  const devices = { devices: [{ name: "jungfrau" }] };
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const endpoint = String(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve(
            endpoint.endsWith("/plans")
              ? plans
              : endpoint.endsWith("/devices")
                ? devices
                : "IDLE",
          ),
      });
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <VisitContext.Provider value={{ visit: "cm12345-1", setVisit: vi.fn() }}>
        <JungfrauRotationProvider>{children}</JungfrauRotationProvider>
      </VisitContext.Provider>
    </QueryClientProvider>
  );
}

function box(label: string): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

const RANGE = "Rotation range (deg)";
const IMAGES = "Number of images";
const INCREMENT = "Omega increment (deg)";

/** Clear a box and type a new value into it, as a user changing a setting would. */
async function retype(label: string, value: string) {
  const user = userEvent.setup();
  await user.clear(box(label));
  await user.type(box(label), value);
  await user.tab();
}

describe("JF rotation range and image count", () => {
  beforeEach(() => {
    stubBlueapi();
    render(<CollectionSetupJf />, { wrapper });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("starts on a full rotation at the default increment", () => {
    expect(box(RANGE).value).toBe("360");
    expect(box(IMAGES).value).toBe("3600");
  });

  it("updates the image count when the range is changed", async () => {
    await retype(RANGE, "90");
    expect(box(IMAGES).value).toBe("900");
  });

  it("updates the range when the image count is changed", async () => {
    await retype(IMAGES, "1000");
    expect(box(RANGE).value).toBe("100");
  });

  it("keeps the range and re-counts the images when the increment is changed", async () => {
    // The sweep is what the user asked for; a finer increment divides it more finely
    // rather than shortening the collection.
    await retype(INCREMENT, "0.2");
    expect(box(RANGE).value).toBe("360");
    expect(box(IMAGES).value).toBe("1800");
  });

  /** The faded field is the one following the other, so read the opacity MUI applied. */
  function fadedness(label: string): string {
    const field = box(label).closest(".MuiFormControl-root");
    return window.getComputedStyle(field as Element).opacity;
  }

  it("fades the image count while the range is the one being set", () => {
    expect(fadedness(RANGE)).toBe("");
    expect(fadedness(IMAGES)).toBe("0.55");
  });

  it("swaps which field is faded when the image count is used instead", async () => {
    await retype(IMAGES, "1000");
    expect(fadedness(IMAGES)).toBe("");
    expect(fadedness(RANGE)).toBe("0.55");
  });

  it("swaps back when the range is used again", async () => {
    await retype(IMAGES, "1000");
    await retype(RANGE, "45");
    expect(fadedness(RANGE)).toBe("");
    expect(fadedness(IMAGES)).toBe("0.55");
  });

  it("puts the coupled fields' tooltips above them, clear of their neighbours", async () => {
    // These sit side by side, and the default "left" placement puts the image count's
    // tooltip straight over the rotation range box next to it.
    const user = userEvent.setup();
    await user.hover(box(IMAGES));
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.getAttribute("data-popper-placement")).toBe("top");
  });

  it("gives back the image count that was asked for", async () => {
    // 43 * 0.05 is 2.1500000000000004, and 2.15 / 0.05 is 42.99999999999999, so a
    // round trip through the range is where an off-by-one would show up.
    await retype(INCREMENT, "0.05");
    await retype(IMAGES, "43");
    expect(box(IMAGES).value).toBe("43");
    expect(box(RANGE).value).toBe("2.15");
  });
});

const TRANSMISSION = "Transmission (fraction)";

function runButton() {
  return screen.getByRole("button", { name: /Run rotation scan/ });
}

describe("JF rotation transmission", () => {
  beforeEach(() => {
    stubBlueapi();
    render(<CollectionSetupJf />, { wrapper });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("accepts a single fraction", async () => {
    await retype(TRANSMISSION, "0.3");
    // Matched narrowly: the field's own tooltip also mentions 0 and 1.
    expect(
      screen.queryByText(/is not between 0 and 1/),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(runButton()).toBeEnabled());
  });

  it("accepts several fractions for a multi-transmission collection", async () => {
    await retype(TRANSMISSION, "0.1, 0.5, 1");
    // Matched narrowly: the field's own tooltip also mentions 0 and 1.
    expect(
      screen.queryByText(/is not between 0 and 1/),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(runButton()).toBeEnabled());
  });

  it.each(["1.5", "-0.2"])("says why %s is not a transmission", async (bad) => {
    await retype(TRANSMISSION, bad);
    expect(screen.getByText(/is not between 0 and 1/)).toBeInTheDocument();
  });

  it("will not run a plan with a transmission outside 0 to 1", async () => {
    // Blocked at the button rather than left to blueapi: a 422 arrives after the task
    // has been submitted, and says nothing about which box was wrong.
    await retype(TRANSMISSION, "5");
    expect(runButton()).toBeDisabled();
  });

  it("submits no task while the transmission is out of range", async () => {
    await retype(TRANSMISSION, "5");
    await userEvent.click(runButton(), { pointerEventsCheck: 0 });
    const fetchMock = vi.mocked(fetch);
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) =>
          String(url).endsWith("/tasks") &&
          ((init as RequestInit | undefined)?.method ?? "GET") === "POST",
      ),
    ).toHaveLength(0);
  });

  it("runs again once the transmission is corrected", async () => {
    await retype(TRANSMISSION, "5");
    expect(runButton()).toBeDisabled();
    await retype(TRANSMISSION, "0.5");
    await waitFor(() => expect(runButton()).toBeEnabled());
  });
});
