import React, {useEffect, useState} from "react";

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/Card';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import FormLabel from '@mui/material/FormLabel';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import {Typography} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import Select from '@mui/material/Select';
import SaveIcon from '@mui/icons-material/Save';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-ini';

import moment from "moment";
import DeleteIcon from '@mui/icons-material/Delete';


function EditableCodeDiv(props) {
  const [state, setState] = useState({
    code: "Loading...",
    openSnackbar: false,
    filename: "config.ini",
    snackbarMsg: "",
    saving: false,
    historicalConfigs: [{ filename: "config.ini", data: "", timestamp: "2000-01-01" }],
    timestamp_ix: 0,
    errorMsg: "",
    isError: false,
    hasChangedSinceSave: true,
    availableConfigs: [{ name: "shared config.ini", filename: "config.ini" }]
  });

  const getConfig = (filename) => {
    fetch(`/api/configs/${filename}`)
      .then(response => response.text())
      .then(text => setState(prev => ({ ...prev, code: text })));
  };


  const getHistoricalConfigFiles = (filename) => {
    fetch(`/api/historical_configs/${filename}`)
      .then(response => response.json())
      .then(listOfHistoricalConfigs => setState(prev => ({
        ...prev,
        historicalConfigs: listOfHistoricalConfigs,
        timestamp_ix: 0
      })));
  };

  const saveCurrentCode = () => {
    setState(prev => ({ ...prev, saving: true, isError: false }));
    fetch(`/api/configs/${state.filename}`, {
      method: "PATCH",
      body: JSON.stringify({ code: state.code, filename: state.filename }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.ok) {
        setState(prev => ({ ...prev, snackbarMsg: `${state.filename} saved and synced.`, hasChangedSinceSave: false, saving: false, openSnackbar: true }));
      } else {
        res.json().then(parsedJson =>
          setState(prev => ({ ...prev, errorMsg: parsedJson['msg'], isError: true, hasChangedSinceSave: true, saving: false }))
        )
      }
    });
  };

  const deleteConfig = () => {
    fetch(`/api/configs/${state.filename}`, {
      method: "DELETE",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.ok) {
        setState(prev => ({ ...prev, snackbarMsg: `${state.filename} deleted.` }));
      } else {
        setState(prev => ({ ...prev, snackbarMsg: "Hm. Something when wrong deleting..." }));
      }
      setState(prev => ({ ...prev, openSnackbar: true }));
      setTimeout(() => {
        window.location.reload();
      }, 750);
    });
  };

  useEffect(() => {
    getConfig(state.filename);
    getHistoricalConfigFiles(state.filename);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function getConfigs() {
      fetch("/api/configs")
      .then(response => response.json())
      .then(json => {
        if (ignore){
          return
        }
        setState(prev => ({
        ...prev,
        availableConfigs: [...prev.availableConfigs, ...json.filter(e => e !== 'config.ini').map(e => ({ name: e, filename: e }))]
        }))
      });
    }

    getConfigs()

    return () => {
      ignore = true;
    };
  }, []);

  const onSelectionChange = (e) => {
    const filename = e.target.value;
    setState(prev => ({ ...prev, filename: filename, code: "Loading..." }));
    getConfig(filename);
    getHistoricalConfigFiles(filename);
  };

  const onSelectionHistoricalChange = (e) => {
    const timestamp = e.target.value;
    const ix = state.historicalConfigs.findIndex((c) => c.timestamp === timestamp);
    const configBlob = state.historicalConfigs[ix];
    setState(prev => ({ ...prev, code: configBlob.data, timestamp_ix: ix }));
  };

  const onTextChange = (code) => {
    setState(prev => ({ ...prev, code: code, hasChangedSinceSave: true }));
  };

  const handleSnackbarClose = () => {
    setState(prev => ({ ...prev, openSnackbar: false }));
  };

  return (
    <React.Fragment>
      <div style={{ width: "100%", margin: "10px", display: "flex", justifyContent: "space-between" }}>
        <FormControl>
          <div>
            <FormLabel component="legend">Config file</FormLabel>
            <Select
              labelId="configSelect"
              variant="standard"
              value={state.filename}
              onChange={onSelectionChange}
            >
              {state.availableConfigs.map((v) => (
                <MenuItem key={v.filename} value={v.filename}>{v.name}</MenuItem>
              ))}
            </Select>
          </div>
        </FormControl>
        {state.historicalConfigs.length > 0 ? (
          <FormControl style={{ marginRight: "20px" }}>
            <div>
              <FormLabel component="legend">Versions</FormLabel>
              <Select
                labelId="historicalConfigSelect"
                variant="standard"
                value={state.historicalConfigs.length > 0 ? state.historicalConfigs[state.timestamp_ix].timestamp : ""}
                displayEmpty={true}
                onChange={onSelectionHistoricalChange}
              >
                {state.historicalConfigs.map((v, i) => (
                  <MenuItem key={v.timestamp} value={v.timestamp}>{i === 0 ? "Current" : moment(v.timestamp).format("MMM DD [at] hh:mm a")}</MenuItem>
                ))}
              </Select>
            </div>
          </FormControl>
        ) : <div></div>}

      </div>

        <div style={{
            tabSize: "4ch",
            border: "1px solid #ccc",
            margin: "10px auto 10px auto",
            position: "relative",
            width: "98%",
            height: "320px",
            maxHeight: "320px",
            overflow: "auto",
            flex: 1
        }}>
          <Editor
            placeholder={state.code}
            value={state.code}
            onValueChange={onTextChange}
            highlight={(code) => highlight(code, languages.ini)}
            padding={10}
            style={{
              fontSize: "14px",
              fontFamily: 'monospace',
              backgroundColor: "hsla(0, 0%, 100%, .5)",
              borderRadius: "3px",
              minHeight: "100%"
            }}
          />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <LoadingButton
            style={{ margin: "5px 12px 5px 12px", textTransform: 'none' }}
            color="primary"
            variant="contained"
            onClick={saveCurrentCode}
            disabled={!state.hasChangedSinceSave}
            loading={state.saving}
            loadingPosition="end"
            endIcon={<SaveIcon />}
          >
            {state.timestamp_ix === 0 ? "Save" : "Revert"}
          </LoadingButton>
          <p style={{ marginLeft: 12 }}>{state.isError ? <Box color="error.main">{state.errorMsg}</Box> : ""}</p>
        </div>
        <Button
          style={{ margin: "5px 10px 5px 10px", textTransform: "none" }}
          color="secondary"
          onClick={deleteConfig}
          disabled={(state.filename === "config.ini")}
        >
          <DeleteIcon fontSize="15" /> Delete config file
        </Button>
      </div>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={state.openSnackbar}
        onClose={handleSnackbarClose}
        message={state.snackbarMsg}
        autoHideDuration={2000}
        key={"edit-config-snackbar"}
      />
    </React.Fragment>
  );
}


function EditConfigContainer(){
  return(
    <React.Fragment>

      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="h5" component="h2">
            <Box fontWeight="fontWeightBold">
              Configuration
            </Box>
          </Typography>
        </Box>
      </Box>

      <Card >
        <CardContent sx={{p: 1}}>
          <EditableCodeDiv/>

          <p style={{textAlign: "center", marginTop: "30px"}}>Learn more about Pioreactor  <a href="https://docs.pioreactor.com/user-guide/configuration" target="_blank" rel="noopener noreferrer">configuration</a>.</p>
        </CardContent>
      </Card>
    </React.Fragment>
)}


function EditConfig(props) {
    React.useEffect(() => {
      document.title = props.title;
    }, [props.title])
    return (
        <Grid container spacing={2} >
          <Grid item md={12} xs={12}>
             <EditConfigContainer/>
          </Grid>
        </Grid>
    )
}

export default EditConfig;

