import { TextField, Tooltip } from "@mui/material";
import React from "react";

interface InputProps<T> {
  value: T;
  onSet: React.Dispatch<React.SetStateAction<T>>;
  label: string;
  tooltip?: string;
}

export function ParameterInput<T>(props: InputProps<T>) {
  return (
    <Tooltip title={props.tooltip ? props.tooltip : ""} placement="left">
      <TextField
        size="small"
        label={props.label}
        defaultValue={props.value}
        onChange={(e) => props.onSet(e.target.value as T)}
        style={{ width: 180 }}
      />
    </Tooltip>
  );
}

interface NumericInputProps {
  value: number;
  onSet: (value: number) => void;
  label: string;
  tooltip?: string;
}

/** A number box whose contents can also be changed by something other than typing in it.
 *
 * ParameterInput is uncontrolled and passes on the raw string, which is fine for a box
 * that only ever reads back what was typed into it. A field that another field can move,
 * or that is computed from others, has to be controlled and has to parse.
 */
export function NumericParameterInput(props: NumericInputProps) {
  // What is being typed, kept separate from the parsed value so a part-finished entry
  // ("", "-", "0.") stays on screen instead of being replaced by whatever it parses to.
  const [draft, setDraft] = React.useState<string | null>(null);

  const handleChange = (entered: string) => {
    setDraft(entered);
    const parsed = Number(entered);
    if (entered.trim() !== "" && Number.isFinite(parsed)) {
      props.onSet(parsed);
    }
  };

  return (
    <Tooltip title={props.tooltip ? props.tooltip : ""} placement="left">
      <TextField
        size="small"
        label={props.label}
        value={draft ?? String(props.value)}
        onChange={(e) => handleChange(e.target.value)}
        // Drop the draft on the way out so the box shows the value that will actually be
        // used, which a linked field may have adjusted.
        onBlur={() => setDraft(null)}
        style={{ width: 180 }}
      />
    </Tooltip>
  );
}
