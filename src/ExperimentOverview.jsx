import { useState, useEffect, Fragment } from 'react';

import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import LogTable from "./components/LogTable";
import ExperimentSummary from "./components/ExperimentSummary";
import Chart from "./components/Chart";
import MediaCard from "./components/MediaCard";
import { Link } from 'react-router-dom';
import {getConfig, getRelabelMap, colors, DefaultDict} from "./utilities"
import Card from "@mui/material/Card";
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Stack from "@mui/material/Stack";
import { useMQTT } from './providers/MQTTContext';
import { useExperiment } from './providers/ExperimentContext';


function mapUnitsToColors(units, colors) {
    const result = {};
    units.forEach((unit, index) => {
        if (index < colors.length) {
            result[unit.pioreactor_unit] = colors[index];
        }
    });
    return result;
}


const TimeFormatSwitch = (props) => {
  const [state, setState] = useState(props.initTimeScale);

  // Update state when props.init changes
  useEffect(() => {
    setState(props.initTimeScale);
  }, [props.initTimeScale]);

  const onChange = (
    event,
    newAlignment,
  ) => {
    if (newAlignment !== null) {
      setState(newAlignment);
      props.setTimeScale(newAlignment);
      localStorage.setItem('timeScale', newAlignment);
    }
  };

  return (
    <ToggleButtonGroup
      color="primary"
      value={state}
      exclusive
      onChange={onChange}
      size="small"
    >
      <ToggleButton style={{textTransform: "None"}} value="hours">Elapsed time</ToggleButton>
      <ToggleButton style={{textTransform: "None"}} value="clock_time">Timestamp</ToggleButton>
    </ToggleButtonGroup>

  );
}



const TimeWindowSwitch = (props) => {
  const [state, setState] = useState(props.initTimeWindow);

  // Update state when props.init changes
  useEffect(() => {
    setState(props.initTimeWindow);
  }, [props.initTimeWindow]);

  const onChange = (
    event,
    newAlignment,
  ) => {
    if (newAlignment !== null) {
      setState(newAlignment);
      props.setTimeWindow(newAlignment);
      localStorage.setItem('timeWindow', newAlignment.toString());
    }
  };
  return (
    <ToggleButtonGroup
      color="primary"
      value={state}
      exclusive
      onChange={onChange}
      size="small"
    >
      <ToggleButton style={{textTransform: "None"}} value={10000000}>All time</ToggleButton>
      <ToggleButton style={{textTransform: "None"}} value={12}>Past 12h</ToggleButton>
      <ToggleButton style={{textTransform: "None"}} value={1}>Past hour</ToggleButton>
    </ToggleButtonGroup>

  );
}

function Charts(props) {
  const [charts, setCharts] = useState({})
  const config = props.config
  const { client, subscribeToTopic, unsubscribeFromTopic } = useMQTT();

  useEffect(() => {
    fetch('/api/contrib/charts')
      .then((response) => response.json())
      .then((data) => {
        setCharts(data.reduce((map, obj) => ((map[obj.chart_key] = obj), map), {}));
      });
  }, []);


  return (
    <Fragment>
      {Object.entries(charts)
        .filter(([chart_key, _]) => config['ui.overview.charts'] && (config['ui.overview.charts'][chart_key] === "1"))
        .map(([chart_key, chart]) =>
          <Fragment key={`grid-chart-${chart_key}`}>
            <Grid item xs={12} >
              <Card sx={{ maxHeight: "100%"}}>
                <Chart
                  key={`chart-${chart_key}`}
                  chartKey={chart_key}
                  config={config}
                  dataSource={chart.data_source}
                  title={chart.title}
                  topic={chart.mqtt_topic}
                  payloadKey={chart.payload_key}
                  yAxisLabel={chart.y_axis_label}
                  experiment={props.experimentMetadata.experiment}
                  deltaHours={props.experimentMetadata.delta_hours}
                  experimentStartTime={props.experimentMetadata.created_at}
                  downSample={chart.down_sample}
                  interpolation={chart.interpolation || "stepAfter"}
                  yAxisDomain={chart.y_axis_domain ? chart.y_axis_domain : null}
                  lookback={props.timeWindow ? props.timeWindow : (chart.lookback ? eval(chart.lookback) : 10000)}
                  fixedDecimals={chart.fixed_decimals}
                  relabelMap={props.relabelMap}
                  yTransformation={eval(chart.y_transformation || "(y) => y")}
                  dataSourceColumn={chart.data_source_column}
                  isPartitionedBySensor={chart_key === "raw_optical_density"}
                  isLiveChart={true}
                  byDuration={props.timeScale === "hours"}
                  client={client}
                  subscribeToTopic={subscribeToTopic}
                  unsubscribeFromTopic={unsubscribeFromTopic}
                  unitsColorMap={props.unitsColorMap}
                />
              </Card>
            </Grid>
          </Fragment>
     )}
    </Fragment>
)}


function Overview(props) {

  const {experimentMetadata, updateExperiment} = useExperiment()
  const [config, setConfig] = useState({})
  const [relabelMap, setRelabelMap] = useState({})

  const initialTimeScale = localStorage.getItem('timeScale') || config['ui.overview.settings']?.['time_display_mode'] || 'hours';
  const initialTimeWindow = parseInt(localStorage.getItem('timeWindow')) || 10000000;
  const [timeScale, setTimeScale] = useState(initialTimeScale);
  const [timeWindow, setTimeWindow] = useState(initialTimeWindow);
  const [units, setUnits] = useState([])
  const unitsColorMap = new DefaultDict(colors)


  useEffect(() => {
    document.title = props.title;
    getConfig(setConfig)
  }, [props.title])

  useEffect(() => {
    async function fetchWorkers(experiment) {
      try {
        const response = await fetch(`/api/experiments/${experiment}/workers`);
        if (response.ok) {
          const units = await response.json();
          setUnits(units);
        } else {
          console.error('Failed to fetch workers:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching workers:', error);
      }
    };


    if (experimentMetadata.experiment){
        getRelabelMap(setRelabelMap, experimentMetadata.experiment)
        fetchWorkers(experimentMetadata.experiment)
    }
  }, [experimentMetadata])

  return (
    <Fragment>
      <Grid container spacing={2} justifyContent="space-between">
        <Grid item xs={12} md={12}>
          <ExperimentSummary experimentMetadata={experimentMetadata} updateExperiment={updateExperiment}/>
        </Grid>


        <Grid item xs={12} md={7} container spacing={2} justifyContent="flex-start" style={{height: "100%"}}>
          <Charts unitsColorMap={unitsColorMap} config={config} timeScale={timeScale} timeWindow={timeWindow} experimentMetadata={experimentMetadata} relabelMap={relabelMap}/>
        </Grid>

        <Grid item xs={12} md={5} container spacing={1} justifyContent="flex-end" style={{height: "100%"}}>

          <Grid item xs={6} md={6}>
            <Stack direction="row" justifyContent="start">
              <TimeWindowSwitch setTimeWindow={setTimeWindow} initTimeWindow={timeWindow}/>
            </Stack>
          </Grid>
          <Grid item xs={6} md={6}>
            <Stack direction="row" justifyContent="end">
              <TimeFormatSwitch setTimeScale={setTimeScale} initTimeScale={timeScale}/>
            </Stack>
          </Grid>

          {( config['ui.overview.cards'] && (config['ui.overview.cards']['dosings'] === "1")) &&
            <Grid item xs={12} >
              <MediaCard activeUnits={units.filter(unit => unit.is_active === 1).map(unit => unit.pioreactor_unit)} experiment={experimentMetadata.experiment} relabelMap={relabelMap}/>
            </Grid>
          }


        {( config['ui.overview.cards'] && (config['ui.overview.cards']['event_logs'] === "1")) &&
          <Grid item xs={12}>
            <LogTable byDuration={timeScale==="hours"} experimentStartTime={experimentMetadata.created_at} experiment={experimentMetadata.experiment} config={config} relabelMap={relabelMap}/>
            <Button to={`/export-data?experiment=${experimentMetadata.experiment}&logs=1`} component={Link} color="primary" style={{textTransform: "none", verticalAlign: "middle", margin: "0px 3px"}}>
              <ListAltOutlinedIcon style={{ fontSize: 17, margin: "0px 3px"}} color="primary"/> Export all logs
            </Button>
          </Grid>
        }
        </Grid>

      </Grid>
    </Fragment>
  );
}
export default Overview;
