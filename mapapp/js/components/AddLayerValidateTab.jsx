/*
 * Copyright 2015-present Boundless Spatial Inc., http://boundlessgeo.com
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import React from 'react';
import ol from 'openlayers';
import Snackbar from 'material-ui/Snackbar';
import Button from 'boundless-sdk/components/Button';
import UploadIcon from 'material-ui/svg-icons/file/file-upload';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import Dialog from 'material-ui/Dialog';
import Dropzone from 'react-dropzone';
import {GridList, GridTile} from 'material-ui/GridList';
import {transformColor, doPOST} from 'boundless-sdk/util.js';
import ColorPicker from 'react-color';
import classNames from 'classnames';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
// import pureRender from 'pure-render-decorator';
import './AddLayer.css';

import util from 'boundless-sdk/util';

import RaisedButton from 'boundless-sdk/components/Button';
import {Tabs, Tab} from 'material-ui/Tabs';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import Divider from 'material-ui/Divider';
import FlatButton from 'material-ui/FlatButton';

import Ajv from 'ajv';
import TextField from 'material-ui/TextField';
import request from 'superagent';
require('superagent-django-csrf');
// require('superagent-csrf') (request);
// import validator from 'validator';
// import Ogr2ogr from 'ogr2ogr';
// import gdal from 'gdal';
// var gdal = require("gdal");


const ID_PREFIX = 'sdk-addlayer-';

const messages = defineMessages({
  errormsg: {
    id: 'addlayer.errormsg',
    description: 'Error message to show when reading features fails',
    defaultMessage: 'There was an error reading your file. ({msg})'
  },
  waitmsg: {
    id: 'addlayer.waitmsg',
    description: 'Wait message to show when reading features',
    defaultMessage: 'Please wait while your dataset is processed ...'
  },
  menutext: {
    id: 'addlayer.menutext',
    description: 'Text of the menu button',
    defaultMessage: 'Upload'
  },
  menutitle: {
    id: 'addlayer.menutitle',
    description: 'Title of the menu button',
    defaultMessage: 'Upload local vector file to application'
  },
  modaltitle: {
    id: 'addlayer.modaltitle',
    description: 'Title of the modal dialog for add layer',
    defaultMessage: 'Upload layer'
  },
  dropzonelabel: {
    id: 'addlayer.dropzonelabel',
    description: 'Label for the drag and drop zone for files',
    defaultMessage: 'File'
  },
  dropzonehelp: {
    id: 'addlayer.dropzonehelp',
    description: 'Help text for the drag and drop zone for files',
    defaultMessage: 'Drop a KML, GPX, GeoRSS or GeoJSON file here, or click to select it.'
  },
  strokecolorlabel: {
    id: 'addlayer.strokecolorlabel',
    description: 'Label text for the stroke color colorpicker',
    defaultMessage: 'Stroke color'
  },
  fillcolorlabel: {
    id: 'addlayer.fillcolorlabel',
    description: 'Label text for the fill color colorpicker',
    defaultMessage: 'Fill color'
  },
  closebuttontext: {
    id: 'addlayervalidatetab.closebuttontext',
    description: 'Title of the close button',
    defaultMessage: 'Clear'
  },
  closebuttontitle: {
    id: 'addlayervalidatetab.closebuttontitle',
    description: 'Tooltip for close button',
    defaultMessage: 'Clear Current File'
  },
  applybuttontext: {
    id: 'addlayer.applybuttontext',
    description: 'Text of the apply button',
    defaultMessage: 'Apply'
  },
  applybuttontitle: {
    id: 'addlayervalidatetab.applybuttontitle',
    description: 'Title of the apply button',
    defaultMessage: 'Add vector layer to map'
  },
  validatetitle: {
    id: 'addlayer.validatetitle',
    description: 'Title for the validate button',
    defaultMessage: 'Validate your metadata structure'
  },
  validatetext: {
    id: 'addlayer.validatetext',
    description: 'Text for the validate button',
    defaultMessage: 'Validate'
  },
  urlinputtext: {
    id: 'addlayer.urlinputtext',
    description: 'Text for the validate button',
    defaultMessage: 'Add file from GeoRSS feed'
  },
  urlinputhint: {
    id: 'addlayer.urlinputhint',
    description: 'Text for the validate button',
    defaultMessage: 'Enter valid url here'
  }
});

/**
 * Adds a menu entry that can be used by the web app user to add a layer to the map.
 * Only vector layers can be added. Supported formats for layers are GeoJSON, GPX and KML.
 *
 * ```xml
 * <AddLayer map={map} />
 * ```
 */
// @pureRender
class AddLayerValidateTab extends React.Component {
  static defaultProps = {
    strokeWidth: 2,
    pointRadius: 7
  };
  constructor(props, context) {
    super(props);
    // this._formats = {
    //   'geojson': new ol.format.GeoJSON(),
    //   'json': new ol.format.GeoJSON(),
    //   'kml': new ol.format.KML({extractStyles: false}),
    //   'gpx': new ol.format.GPX()
    // };
    this._counter = 0;
    this.state = {
      fillColor: 'rgb(66, 179, 244)',
      strokeColor: '#66ff33',
      open: false,
      error: false,
      errorOpen: false,
      fileName: null,
      fileContent: "",
      conversion: false,
      urlinput: null,
      validateErrors: [], //for validation method
      validateMsg: "",
      showProgress: false,
      value: 1,
      validationDialog: false,
      muiTheme: context.muiTheme || getMuiTheme()
    };
  }
  static formats = {
    'geojson': new ol.format.GeoJSON(),
    'json': new ol.format.GeoJSON(),
    'kml': new ol.format.KML({extractStyles: false}),
    'gpx': new ol.format.GPX()
  };  
  getChildContext() {
    return {muiTheme: getMuiTheme()};
  }
  _showDialog() {
    this.setState({open: true});
  }
  _closeDialog() {
    this.setState({conversionActive: false, fileName: null, showProgress: false, open: false, validateErrors: [], validateMsg: ""});
  }
  handleOpen = () => {
    this.setState({validationDialog: true});
  };
  handleClose = () => {
    this.setState({validationDialog: false});
  };
  _readFile(text) {
    this._text = text;
  }
  _generateId() {
    return ID_PREFIX + this._counter;
  }
  _readVectorFile() {

    this.setState({
      showProgress: true, conversionActive: false, 
    });
    var me = this;
    global.setTimeout(function() {
      // ******adjustments start here (if clauses) when a file conversion has been triggered and done.. for reversion check backup file in same folder
      // this is not always necessary, eg the supported formats from ol3, but this way it should work with all of them
      if (me.state.conversion === true) {
        var text = me.state.fileContent;
      } else {
        var text = me._text;
      }
      var filename = me.state.fileName;
      if (text && filename) {
        if (me.state.conversion === true) {
          var ext = 'geojson';
          me.setState({conversion: false});
        } else {
          var ext = filename.split('.').pop().toLowerCase();
        }
        // ******end of adjustments
        var format = AddLayerValidateTab.formats[ext];
        var map = me.props.map;
        if (format) {
          try {
            var crs = format.readProjection(text);
            if (crs === undefined) {
              me.setState({showProgress: false, error: true, fileName: null, errorOpen: true, msg: 'Unsupported projection'});
              return;
            }
            var features = format.readFeatures(text, {dataProjection: crs,
              featureProjection: map.getView().getProjection()});
            if (features && features.length > 0) {
              // *** if color coming as object from color picker use following two lines to convert
              // var fill = new ol.style.Fill({color: util.transformColor(me.state.fillColor)});
              // var stroke = new ol.style.Stroke({color: util.transformColor(me.state.strokeColor), width: me.props.strokeWidth});
              // ***
              var fill = new ol.style.Fill({color: me.state.fillColor});
              var stroke = new ol.style.Stroke({color: me.state.strokeColor, width: me.props.strokeWidth});
              var style = new ol.style.Style({
                fill: fill,
                stroke: stroke,
                image: new ol.style.Circle({stroke: stroke, fill: fill, radius: me.props.pointRadius})
              });
              me._counter++;
              var lyr = new ol.layer.Vector({
                opacity: 0.7,
                id: me._generateId(),
                style: style,
                source: new ol.source.Vector({
                  features: features,
                  wrapX: false
                }),
                title: filename,
                isRemovable: true,
                isSelectable: true
              });
              map.addLayer(lyr);
              var extent = lyr.getSource().getExtent();
              var valid = true;
              for (var i = 0, ii = extent.length; i < ii; ++i) {
                var value = extent[i];
                if (Math.abs(value) == Infinity || isNaN(value) || (value < -20037508.342789244 || value > 20037508.342789244)) {
                  valid = false;
                  break;
                }
              }
              if (valid) {
                map.getView().fit(extent, map.getSize());
              }
              me._closeDialog();
            }
          } catch (e) {
            if (global && global.console) {
              me.setState({showProgress: false, error: true, fileName: null, errorOpen: true, msg: e.message});
            }
          }
        }
      }
    }, 0);
  }
  _urlUpload(evt) {
    // ***this method is a workaround to get the field input value (url) in state (advantage: it is only used when another method is called)
    // Option A, dedicated button: With dedicated button to trigger other method only this line is needed; A dedicated button is preferable since any valid url will invoke the conversion
    this.setState({urlinput: evt.target.value});
    // in addition tried the url validation with:
    // var urlinput = evt.target.value;
    // if (validator.isURL(urlinput)) {
    //     console.log('valid url?!');
    //     this.setState({urlinput: urlinput});
    //     //dont do request here as it would run each time a url is valid, rather put in state and use later
    // } else {
    //   console.log('not a valid url');
    // }
  }
  _urlGetConvert() {
    // *****Option A: send link to django directly and continue there
    // csrf token through requiring patch superagent-django-csrf
    if (this.state.urlinput.split('.').pop().toLowerCase() === 'json') {
      request
        .post('/upload/')
        .field('url', this.state.urlinput)
        .field('suffix', 'isJson')
        .end(function(err, res){
          this.setState({conversionActive: true, conversion: true, fileContent: res.text, fileName: this.state.urlinput});
        }.bind(this));

      // request.get(this.state.urlinput).end(function(err, res) {
      //   console.log(res);
      // }.bind(this));
      // request
    } else {
      request
        .post('/upload/')
        .field('url', this.state.urlinput)
        .field('suffix', '.georss')
        .end(function(err, res){
          this.setState({conversionActive: true, conversion: true, fileContent: res.text, fileName: this.state.urlinput + '.georss'});
        }.bind(this));
    }
    // *****Option B: request here and send as file contens directly to django, something like this (but CORS problem)
    // request
    //  // .get('http://emergency.copernicus.eu/mapping/list-of-components/EMSR182/feed')
    //  .get(this.state.urlinput)
    //  .withCredentials()
    //  .end(function(err, res){
    //     console.log(res);
    //  });
    // this.setState({urlinput: null});
  }
  _onDrop(files) {
    if (files.length === 1) {
      var r = new FileReader(), file = files[0];
      
      var me = this;
      this.setState({fileName: file.name});
      r.onload = function(e) {
        me._readFile(e.target.result);
      };
      r.readAsText(file);

      var filename = file.name; //the filename..
      var ext = filename.split('.').pop().toLowerCase(); //needed to pass the file type, e.g. for conversion input
      var suffix = '.' + ext;

      if (ext !== 'geojson' && ext !== 'json') { //ol supported formats could be added here, with this in place everything gets directly converted to geojson.. if it is only needed for validation, then this could be moved to validate method
        //******************************************
        //     Approach: GET FILE from SuperAgent (example from react dropzone); GET FILE from SDK AND doPOST (vanilla) Django in memory is an alternative (see utils.js)
        //******************************************
        var req = request.post('/upload/');
        files.forEach((file)=> {
            req.attach('inputFile', file);
            req.field('suffix', suffix);
        });
        req.end(function(err, res) {
          this.setState({conversion: true, fileContent: res.text});
        }.bind(this));
      } else {
        console.log('File is already json/geojson. No need for conversion.')
        //this is left empty, if file is already geojson/json is can be directly forwarded to validation
      }
      // ===> WHY NOT DO VALIDATION AUTOMATICALLY (HERE) WITH EVERY UPLOAD?? and show result in dedicated space
    }
  }
  onDropValidate() {
    var ajv = Ajv({allErrors: true});
    //SCHEMA
    // var schema = require('../../../../schema/json-schema-aoi.json'); //local JSON Schema
    // var schema = require('../schema/json-schema-aoi.json'); //local JSON Schema
    var schema = require('../schema/json-schema-geojson-map.json');
    var validate = ajv.compile(schema);
    //DATA
    var me = this; //uploaded data from AddLayer
    var filename = me.state.fileName; //the filename or name given in case of url
    var ext = filename.split('.').pop().toLowerCase(); //needed to pass the file type, e.g. for conversion input; .georss currently hardcoded in method urlUpload
    if (ext !== 'geojson' && ext !== 'json') {
      var text = me.state.fileContent;
    } else {
      var text = me._text; //the content of the file (eg geojson structure)
    }
    var input = JSON.parse(text); //make array of objects from file contents
    //VALIDATE
    var valid = validate(input);
    if (valid) {
      this.setState({validateMsg: 'Valid!'}); //console.log('Valid!');
    } else {
        //console.log('Invalid: ' + ajv.errorsText(validate.errors));
        //this.setState({validateErrors: 'Invalid: ' + ajv.errorsText(validate.errors)}); 
        var errors = [];
        for (var i = 0; i < validate.errors.length; i++) {
          if (validate.errors[i].dataPath == ".features[0].properties") {
            errors.push(validate.errors[i].message);
            // errors.push(validate.errors[i].params.missingProperty);
          }
        }
      this.setState({validateMsg: 'Invalid according to the specification: ', validateErrors: errors})
    }
    this.setState({validationDialog: true});
  }
  _onChangeStroke(color) {
    this.setState({strokeColor: color.rgb});
  }
  _onChangeFill(color) {
    this.setState({fillColor: color.rgb});
  }
  _handleRequestClose() {
    this.setState({
      errorOpen: false
    });
  }
  getStyles() {
    const muiTheme = this.state.muiTheme;
    const rawTheme = muiTheme.rawTheme;
    return {
      dialog: {
        color: rawTheme.palette.textColor
      }
    };
  }
  handleChange = (value) => {
    this.setState({
      value: value,
    });
  };
  render() {
    const {formatMessage} = this.props.intl;
    const styles = this.getStyles();
    const backButton = [
      <FlatButton
        label="Back"
        primary={true}
        onTouchTap={this.handleClose}
      />];
    var error;
    if (this.state.error === true) {
      error = (<Snackbar
        autoHideDuration={5000}
        style={{transitionProperty : 'none'}}
        bodyStyle={{lineHeight: '24px', height: 'auto'}}
        open={this.state.errorOpen}
        message={formatMessage(messages.errormsg, {msg: this.state.msg})}
        onRequestClose={this._handleRequestClose.bind(this)}
      />);
    }
    var body;
    if (this.state.showProgress) {
      body =  (<p className='add-layer-wait-msg'>{formatMessage(messages.waitmsg)}</p>);
    } else {
      body = (
      <div>
        <Tabs id="tabsInner" value={this.state.value} onChange={this.handleChange.bind(this)}>
          
          <Tab style={{backgroundColor: '#ffffff', color: 'grey'}} disableTouchRipple={true} value={1} label="Add Local File" >
            <Card >     
              <CardHeader title="Add data from local file" subtitle="Subtitle" />
              <CardText >
                <Dropzone className='dropzone' multiple={false} onDrop={this._onDrop.bind(this)} >
                  <div className='add-layer-filename'>{this.state.fileName}</div>
                  <div className='add-layer-dropzonehelp'>{'Drop a KML, GPX, GeoRSS or GeoJSON file here, or click to select it.'}</div>
                </Dropzone>
              </CardText>   
              <Divider style={{marginTop: 20}} />
              <CardActions style={{textAlign: 'center'}}>
                <Button buttonType='Flat' tooltip={formatMessage(messages.applybuttontitle)} disabled={this.state.showProgress || this.state.fileName === null} label={formatMessage(messages.applybuttontext)} onTouchTap={this._readVectorFile.bind(this)} />,
                <Button buttonType='Flat' disabled={this.state.showProgress} label={formatMessage(messages.closebuttontext)} tooltip={formatMessage(messages.closebuttontitle)} onTouchTap={this._closeDialog.bind(this)} />,
                <RaisedButton label={formatMessage(messages.validatetext)} tooltip={formatMessage(messages.validatetitle)} onTouchTap={this.onDropValidate.bind(this)} disableTouchRipple={true}/>,
                <RaisedButton label='export' tooltip='This will adjust the original structure and download a new compliant file (removes additional and adds missing properties)' onTouchTap={this.onDropValidate.bind(this)} disableTouchRipple={true}/>
              </CardActions>
            </Card>
          </Tab>
          <Tab style={{backgroundColor: '#ffffff', color: 'grey'}} disableTouchRipple={true} value={2} label="Add Remote File" >
            <Card>
              <CardHeader title="Add GeoRSS data from URL/ remote file" subtitle="Subtitle" style={{paddingBottom: 0}} />
              <div>
              <TextField style={{width: 'calc(100% - 165px)', paddingLeft: 16, paddingRight: 16}} onChange={this._urlUpload.bind(this)} floatingLabelText={formatMessage(messages.urlinputtext)} id='urlinput' hintText={formatMessage(messages.urlinputhint)} />
              <RaisedButton  style={{marginLeft: 15}} secondary={this.state.conversionActive} label='Add URL' tooltip='Load file into system' onTouchTap={this._urlGetConvert.bind(this)} disableTouchRipple={true}/>
              </div>
              <Divider style={{marginTop: 20}} />
              <CardActions style={{textAlign: 'center'}} >
                <Button buttonType='Flat' tooltip={formatMessage(messages.applybuttontitle)} disabled={this.state.showProgress || this.state.fileName === null} label={formatMessage(messages.applybuttontext)} onTouchTap={this._readVectorFile.bind(this)} />,
                <Button buttonType='Flat' disabled={this.state.showProgress} label={formatMessage(messages.closebuttontext)} tooltip={formatMessage(messages.closebuttontitle)} onTouchTap={this._closeDialog.bind(this)} />,
                <RaisedButton label={formatMessage(messages.validatetext)} tooltip={formatMessage(messages.validatetitle)} onTouchTap={this.onDropValidate.bind(this)} disableTouchRipple={true}/>,
                <RaisedButton label='export' tooltip='This will adjust the original structure and download a new compliant file (removes additional and adds missing properties)' onTouchTap={this.onDropValidate.bind(this)} disableTouchRipple={true}/>
              </CardActions>
            </Card>
          </Tab>
        </Tabs>

        <Dialog
          title="Validation Result"
          actions={backButton}
          modal={false}
          open={this.state.validationDialog}
          onRequestClose={this.handleClose}
        >
          <div className='validation-result' style={{paddingTop: 10}} >
            {this.state.validateMsg}
            <ul>
              {this.state.validateErrors.map((validateErrors, index) => (
                <li key={index}>Your file {validateErrors}</li>
              ))}
            </ul>
          </div>
        </Dialog>
</div>
            
      );
    }
    return (
      <div>
        {error}
        {body}
      </div>
    );
  }
}

AddLayerValidateTab.propTypes = {
  /**
   * The ol3 map instance to add to.
   */
  map: React.PropTypes.instanceOf(ol.Map).isRequired,
  /**
   * Css class name to apply on the button.
   */
  applied: React.PropTypes.bool,
  /**
   * This to tell app.jsx to switch tab when apply is pressed.
   */  
  className: React.PropTypes.string,
  /**
   * The stroke width in pixels used in the style for the uploaded data.
   */
  strokeWidth: React.PropTypes.number,
  /**
   * The point radius used for the circle style.
   */
  pointRadius: React.PropTypes.number,
  /**
   * i18n message strings. Provided through the application through context.
   */
  intl: intlShape.isRequired
};

// AddLayerValidateTab.defaultProps = {
//   strokeWidth: 2,
//   pointRadius: 7
// };

AddLayerValidateTab.contextTypes = {
  muiTheme: React.PropTypes.object
};

AddLayerValidateTab.childContextTypes = {
  muiTheme: React.PropTypes.object.isRequired
};

export default injectIntl(AddLayerValidateTab);
