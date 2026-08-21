import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, describe, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { DetectorSelection } from "./DetectorSelection";
import { detectors } from "./params";

/** The dropdown holding its own state, as the collection forms hold it for it. */
function Harness() {
  const [detector, setDetector] = useState<string>(detectors[0]);
  return <DetectorSelection detector={detector} setDetector={setDetector} />;
}

async function choose(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("Detector"));
  await user.click(within(screen.getByRole("listbox")).getByText(name));
}

describe("DetectorSelection", () => {
  afterEach(cleanup);

  it("starts on the eiger, so a collection that ignores it runs where it always did", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Detector")).toHaveTextContent("eiger");
  });

  it("offers every detector a serial collection can run on", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("Detector"));

    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(detectors);
  });

  it("holds the detector that was picked", async () => {
    render(<Harness />);

    await choose("jungfrau");

    expect(screen.getByLabelText("Detector")).toHaveTextContent("jungfrau");
  });
});
