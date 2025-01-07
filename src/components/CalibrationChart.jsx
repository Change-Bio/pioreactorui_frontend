import React from "react";
import {
  VictoryChart,
  VictoryScatter,
  VictoryLine,
  VictoryAxis,
  VictoryLegend,
  VictoryTheme,
  VictoryLabel,
} from "victory";
import {colors} from './../utilities'

/**
 * Evaluates a polynomial at x given an array of coefficients in descending order.
 * e.g., [a, b, c] => a*x^2 + b*x + c
 */
function evaluatePolynomial(x, coeffs) {
  return coeffs.reduce((acc, coefficient, i) => {
    const power = coeffs.length - 1 - i; // descending power
    return acc + coefficient * Math.pow(x, power);
  }, 0);
}

/**
 * Generates a set of [x, y] points along a polynomial curve for plotting.
 * We base the domain on the recorded_data.x for each calibration.
 */
function generatePolynomialData(calibration, stepCount = 50) {
  const { x: xValues } = calibration.recorded_data;
  const coeffs = calibration.curve_data_ || [];

  if (!xValues || xValues.length === 0) {
    // No recorded data => fallback domain
    // Adjust these as needed or handle differently
    const fallbackXMin = 0;
    const fallbackXMax = 1;
    const stepSize = (fallbackXMax - fallbackXMin) / (stepCount - 1);

    return Array.from({ length: stepCount }).map((_, i) => {
      const x = fallbackXMin + i * stepSize;
      return { x, y: evaluatePolynomial(x, coeffs) };
    });
  }

  // Determine min/max from recorded data
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);

  // If all xValues are the same, give some small range
  if (xMin === xMax) {
    return [{ x: xMin, y: evaluatePolynomial(xMin, coeffs) }];
  }

  const stepSize = (xMax - xMin) / (stepCount - 1);
  const points = [];

  for (let i = 0; i < stepCount; i++) {
    const x = xMin + i * stepSize;
    points.push({ x, y: evaluatePolynomial(x, coeffs) });
  }
  return points;
}

/**
 * Renders a single VictoryChart for the calibrations of one device.
 * @param {Array} calibrations - array of calibration objects
 *   (each containing recorded_data.x, recorded_data.y, curve_data_, etc.)
 * @param {String} deviceName  - optional device name for display
 */
function CalibrationChart({ calibrations, deviceName }) {
  if (!calibrations || calibrations.length === 0) {
    return <div>No calibrations to plot for {deviceName}.</div>;
  }

  // Assume the x and y fields match across all calibrations for a device
  const { x: xField = "X", y: yField = "Y" } = calibrations[0] || {};

  const countOf = calibrations.length

  return (
      <VictoryChart
        title={`${deviceName} Calibrations`}
        style={{ parent: { maxWidth: "800px"}}}
        domainPadding={10}
        height={295 + 25 * Math.ceil(countOf / 4)}
        width={750}
        theme={VictoryTheme.material}
        padding={{ left: 50, right: 50, bottom: 40 + 25 * Math.ceil(countOf / 4), top: 45 }}
      >
        <VictoryLabel
            text={`${deviceName} Calibrations`}
            x={400}
            y={30}
            textAnchor="middle"
            style={{
              fontSize: 16,
              fontFamily: "inherit",
            }}
        />

          <VictoryAxis
            style={{
              tickLabels: {
                fontSize: 14,
                padding: 5,
                fontFamily: "inherit",
              },
            }}
            offsetY={40 + 25 * Math.ceil(countOf / 4)}
            label={xField}
            orientation="bottom"
            fixLabelOverlap={true}
            axisLabelComponent={
              <VictoryLabel
                dy={20}
                dx={0}
                style={{
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              />
            }
          />


          <VictoryAxis
            crossAxis={false}
            dependentAxis
            label={yField}
            axisLabelComponent={
              <VictoryLabel
                dy={-30}
                style={{
                  fontSize: 12,
                  padding: 10,
                  fontFamily: "inherit",
                }}
              />
            }
            style={{
              tickLabels: {
                fontSize: 14,
                padding: 5,
                fontFamily: "inherit",
              },
            }}
          />

        {calibrations.map((cal, index) => {
          // Convert recorded_data into an array of {x, y} for scatter
          const scatterData = (cal.recorded_data?.x || []).map((xVal, i) => ({
            x: xVal,
            y: cal.recorded_data.y?.[i] ?? null,
          }));

          // Simple color selection (optional)
          const color = colors[index]

          return (
              <VictoryScatter
                key={cal.calibration_name}
                data={scatterData}
                style={{ data: { fill: color, fillOpacity: 0.8, } }}
                size={3}
              />
          );
        })}

        {calibrations.map((cal, index) => {

          // Generate polynomial curve
          const polynomialData = generatePolynomialData(cal);

          // Simple color selection (optional)
          const color = colors[index]

          return (
              <VictoryLine
                key={cal.calibration_name || index}
                interpolation='basis'
                data={polynomialData}
                style={{ data: { stroke: color } }}
              />
          );
        })}
        <VictoryLegend
          x={70}
          y={300}
          symbolSpacer={6}
          itemsPerRow={7}
          orientation="horizontal"
          gutter={15}
          rowGutter={5}
          name="legend"
          borderPadding={{ right: 8 }}
          data={calibrations.map((cal, index) => ({
            name: cal.pioreactor_unit,
            symbol: { fill: colors[index] },
          }))}
        />

      </VictoryChart>
  );
}

export default CalibrationChart;
