import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";
import React from "react";
import { detectors } from "./params";

/** Dropdown to choose which detector a serial collection runs on.
 *
 * Every detector sits on the same carriage, so choosing one is also asking for the
 * carriage to be moved to put it in the beam. The collection plan does that itself,
 * and only if it is not there already.
 */
export function DetectorSelection({
  detector,
  setDetector,
}: {
  detector: string;
  setDetector: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <Tooltip
      title="Detector to collect on. The carriage will be moved to put it in the beam."
      placement="right"
    >
      <FormControl size="small" style={{ width: 180 }}>
        <InputLabel id="detector-label">Detector</InputLabel>
        <Select
          labelId="detector-label"
          id="detector"
          value={detector}
          label="Detector"
          onChange={(e) => setDetector(String(e.target.value))}
        >
          {detectors.map((choice) => (
            <MenuItem key={choice} value={choice}>
              {choice}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  );
}
