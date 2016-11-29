import { ipcRenderer } from 'electron';
import { push } from 'react-router-redux';
import { serverLogsReceived, clearLogs } from './ServerMonitor';
import settings from 'electron-settings';

export const SERVER_START_REQ = 'SERVER_START_REQ';
export const SERVER_START_OK = 'SERVER_START_OK';
export const SERVER_START_ERR = 'SERVER_START_ERR';
export const UPDATE_ARGS = 'UPDATE_ARGS';
export const SWITCH_TAB = 'SWITCH_TAB';
export const PRESET_SAVE_REQ = 'PRESET_SAVE_REQ';
export const PRESET_SAVE_OK = 'PRESET_SAVE_OK';
export const GET_PRESETS = 'GET_PRESETS';
export const PRESET_DELETE_REQ = 'PRESET_DELETE_REQ';
export const PRESET_DELETE_OK = 'PRESET_DELETE_OK';

export function startServer (evt) {
  evt.preventDefault();
  return (dispatch, getState) => {
    // signal to the UI that we are beginning our request
    dispatch({type: SERVER_START_REQ});
    const {serverArgs} = getState().startServer;

    // if we get an error from electron, fail with the message
    ipcRenderer.once('appium-start-error', (event, message) => {
      // don't listen for log lines any more if we failed to start, other-
      // wise we'll start to stack listeners for subsequent attempts
      ipcRenderer.removeAllListeners('appium-log-line');
      alert(`Error starting Appium server: ${message}`);
      dispatch({type: SERVER_START_ERR});
    });

    ipcRenderer.once('appium-start-ok', () => {
      // don't listen for subsequent server start failures later in the
      // lifetime of this app instance
      ipcRenderer.removeAllListeners('appium-start-error');
      dispatch({type: SERVER_START_OK});
      dispatch(push('/monitor'));
    });

    ipcRenderer.on('appium-log-line', (event, logs) => {
      dispatch(serverLogsReceived(logs));
    });

    dispatch(clearLogs());
    ipcRenderer.send('start-server', serverArgs);
  };
}

export function updateArgs (args) {
  return (dispatch) => {
    dispatch({type: UPDATE_ARGS, args});
  };
}

export function switchTab (tabId) {
  return (dispatch) => {
    dispatch({type: SWITCH_TAB, tabId});
  };
}

export function savePreset (name, args) {
  return (dispatch) => {
    dispatch({type: PRESET_SAVE_REQ});
    settings.get('presets').then((presets) => {
      presets[name] = args;
      presets[name]._modified = Date.now();
      return settings.set('presets', presets);
    }).then(() => {
      return settings.get('presets');
    }).then((presets) => {
      dispatch({type: PRESET_SAVE_OK, presets});
    }).catch(console.error);
  };
}

export function getPresets () {
  return (dispatch) => {
    settings.get('presets').then((presets) => {
      dispatch({type: GET_PRESETS, presets});
    }).catch(console.error);
  };
}

export function deletePreset (name) {
  return (dispatch) => {
    dispatch({type: PRESET_DELETE_REQ});
    settings.get('presets').then((presets) => {
      delete presets[name];
      return settings.set('presets', presets);
    }).then(() => {
      return settings.get('presets');
    }).then((presets) => {
      dispatch({type: PRESET_DELETE_OK, presets});
    }).catch(console.error);
  };
}
