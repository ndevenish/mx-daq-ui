import { RunPlanButton, AbortButton } from "#/blueapi/BlueapiComponents.tsx";
import { JungfrauRotationContext } from "#/context/jungfrau/JungfrauRotationContext.ts";
import { VisitContext } from "#/context/VisitContext.ts";
import {
  Box,
  Grid2 as Grid,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import React from "react";
import { useContext } from "react";
import { NumericParameterInput, ParameterInput } from "../ParameterInputs";
import {
  fullStorageDirectory,
  getCurrentVisit,
  imagesInSweep,
  parseTransmissions,
  sweepForImages,
} from "./jfUtils";

function RunButtons({
  currentVisit,
  blockedReason,
}: {
  currentVisit: string;
  /** Why the plan cannot be run, if it cannot; shown in place of the usual tooltip. */
  blockedReason?: string;
}): JSX.Element {
  const {
    expTime,
    detDist,
    fileName,
    omegaStart,
    omegaIncrement,
    scanWidth,
    transFract,
  } = useContext(JungfrauRotationContext);
  console.log(transFract);
  return (
    <React.Fragment>
      <Stack direction={"row"} spacing={4} justifyContent={"center"}>
        <RunPlanButton
          btnLabel="Run rotation scan"
          planName="gui_run_jf_rotation_scan"
          planParams={{
            exposure_time_s: expTime,
            omega_start_deg: omegaStart,
            omega_increment_deg: omegaIncrement,
            scan_width_deg: scanWidth,
            det_distance_mm: detDist,
            filename: fileName,
            transmissions: transFract,
          }}
          currentVisit={currentVisit}
          title={blockedReason ?? "Run the jungfrau rotation scan plan"}
          disabled={blockedReason !== undefined}
          btnSize="large"
        />
        <AbortButton />
      </Stack>
    </React.Fragment>
  );
}

export function CollectionSetupJf() {
  const theme = useTheme();
  const context = useContext(JungfrauRotationContext);
  // Which of the linked pair the user last drove the sweep with. The range is what the
  // plan is sent, so that is what leads until the count is used instead.
  const [sweepSetBy, setSweepSetBy] = React.useState<"range" | "images">(
    "range",
  );
  // Kept as text so a rejected entry stays on screen to be corrected, rather than
  // silently leaving the last good value in place to be collected with.
  const [transmissionText, setTransmissionText] = React.useState<string>(
    context.transFract.join(", "),
  );
  const transmissions = parseTransmissions(transmissionText);

  const handleTransmissionChange = (entered: string) => {
    setTransmissionText(entered);
    const parsed = parseTransmissions(entered);
    if (parsed.values) {
      context.setTransFract(parsed.values);
    }
  };
  const { visit } = useContext(VisitContext);
  const currentVisit = getCurrentVisit(visit);
  const storageDirectory = fullStorageDirectory(currentVisit);
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Stack direction={"column"} alignItems={"center"} spacing={5}>
        <Typography
          variant="h2"
          sx={{
            color: theme.palette.text.primary,
            fontSize: 24,
            fontWeight: "fontWeightBold",
          }}
        >
          Collection Parameters
        </Typography>
        <TextField
          size="small"
          label="Storage Directory"
          value={storageDirectory}
          style={{ width: 570 }}
          slotProps={{
            input: { readOnly: true },
          }}
        />
        <Grid container spacing={2} marginTop={3} justifyContent={"center"}>
          <ParameterInput
            value={context.fileName}
            onSet={context.setFileName}
            label="File Name"
            tooltip="Name to use to save the data"
          />
          <ParameterInput
            value={context.expTime}
            onSet={context.setExpTime}
            label="Exposure Time (s)"
            tooltip="Exposure time for each window, in seconds"
          />
          <ParameterInput
            value={context.detDist}
            onSet={context.setDetDist}
            label="Detector Distance (mm)"
            tooltip="Sample detector distance, in millimeters"
          />
        </Grid>
        <Grid container spacing={2} marginTop={3} justifyContent={"center"}>
          <NumericParameterInput
            value={context.omegaStart}
            onSet={context.setOmegaStart}
            label="Omega start (deg)"
            tooltip="Rotation start value, in deg"
          />
          <NumericParameterInput
            value={context.omegaIncrement}
            onSet={context.setOmegaIncrement}
            label="Omega increment (deg)"
            tooltip="Rotation increment step, in deg"
          />
        </Grid>
        <Grid
          container
          spacing={2}
          marginTop={3}
          justifyContent={"center"}
          alignItems={"center"}
        >
          {/* The plan is given the rotation range; the image count is the same setting
          seen through the increment, so either box can be typed into. The one not
          driving the pair is faded, to show which way round they are being used. */}
          <NumericParameterInput
            value={context.scanWidth}
            onSet={(width) => {
              setSweepSetBy("range");
              context.setScanWidth(width);
            }}
            label="Rotation range (deg)"
            tooltip="Total sweep of the rotation, in deg"
            tooltipPlacement="top"
            dimmed={sweepSetBy !== "range"}
          />
          <Tooltip
            title="Rotation range and number of images are two views of the same sweep, linked by the omega increment"
            placement="top"
          >
            <SwapHorizIcon
              fontSize="small"
              sx={{ color: "text.secondary", mx: -0.5 }}
            />
          </Tooltip>
          <NumericParameterInput
            value={imagesInSweep(context.scanWidth, context.omegaIncrement)}
            onSet={(images) => {
              setSweepSetBy("images");
              context.setScanWidth(
                sweepForImages(images, context.omegaIncrement),
              );
            }}
            label="Number of images"
            tooltip="Images collected over the sweep. Setting this adjusts the rotation range to match, at the current increment."
            tooltipPlacement="top"
            dimmed={sweepSetBy !== "images"}
          />
        </Grid>
        <Grid container spacing={2} marginTop={3} justifyContent={"center"}>
          <Tooltip
            title="Request transmission value(s) for collection, expressed as a fraction between 0 and 1. If running a single rotation, just input one value, if running multiples separate them with commas."
            placement="top"
          >
            <TextField
              size="small"
              label="Transmission (fraction)"
              value={transmissionText}
              onChange={(e) => handleTransmissionChange(e.target.value)}
              error={transmissions.error !== undefined}
              helperText={transmissions.error}
              style={{ width: 380 }}
            />
          </Tooltip>
        </Grid>
        <RunButtons
          currentVisit={currentVisit}
          blockedReason={transmissions.error}
        />
      </Stack>
    </Box>
  );
}
