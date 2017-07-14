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
import ReactDOM from 'react-dom';
import ol from 'openlayers';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import classNames from 'classnames';
import debounce from  'debounce';
import ReactTable from 'react-table'
import {Card, CardHeader, CardText, CardActions} from 'material-ui/Card';
import RaisedButton from 'boundless-sdk/components/Button';
import ActionSearch from 'material-ui/svg-icons/action/search';
import ClearIcon from 'material-ui/svg-icons/content/clear';
import DownloadIcon from 'material-ui/svg-icons/file/file-download';
import TextField from 'material-ui/TextField';
import Checkbox from 'material-ui/Checkbox';
import LayerStore from 'boundless-sdk/stores/LayerStore.js';
import FeatureStore from 'boundless-sdk/stores/FeatureStore';
import SelectActions from 'boundless-sdk/actions/SelectActions';
import LayerSelector from 'boundless-sdk/components/LayerSelector';
import {Toolbar, ToolbarSeparator, ToolbarGroup, ToolbarTitle} from 'material-ui/Toolbar';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import Snackbar from 'material-ui/Snackbar';
import FilterService from 'boundless-sdk/services/FilterService';
import FilterHelp from 'boundless-sdk/components/FilterHelp';
import Paper from 'material-ui/Paper';
import './react-table-tab.css';
import './FeatureTableTab.css';
import Toggle from 'material-ui/Toggle';
import Ajv from 'ajv';
import AutoComplete from 'material-ui/AutoComplete';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import AppDispatcher from 'boundless-sdk/dispatchers/AppDispatcher';

const messages = defineMessages({
  optionslabel: {
    id: 'featuretable.optionslabel',
    description: 'Label for the collapsble options',
    defaultMessage: 'Options'
  },
  nodatamsg: {
    id: 'featuretable.nodatamsg',
    description: 'Message to display if there are no layers with data',
    defaultMessage: 'You haven\’t loaded any layers with feature data yet, so there is no data to display in the table. When you add a layer with feature data, that data will show here.'
  },
  errormsg: {
    id: 'featuretable.errormsg',
    description: 'Error message to show when filtering fails',
    defaultMessage: 'There was an error filtering your features. ({msg})'
  },
  loaderrormsg: {
    id: 'featuretable.loaderrormsg',
    description: 'Error message to show when loading fails',
    defaultMessage: 'There was an error loading your features. ({msg})'
  },
  layerlabel: {
    id: 'featuretable.layerlabel',
    description: 'Label for the layer select',
    defaultMessage: 'Layer'
  },
  zoombuttontitle: {
    id: 'featuretable.zoombuttontitle',
    description: 'Title for the zoom button',
    defaultMessage: 'Zoom to selected'
  },
  zoombuttontext: {
    id: 'featuretable.zoombuttontext',
    description: 'Text for the zoom button',
    defaultMessage: 'Zoom'
  },
  clearbuttontitle: {
    id: 'featuretable.clearbuttontitle',
    description: 'Title for the clear button',
    defaultMessage: 'Clear selected'
  },
  clearbuttontext: {
    id: 'featuretable.clearbuttontext',
    description: 'Text for the clear button',
    defaultMessage: 'Clear'
  },
  onlyselected: {
    id: 'featuretable.onlyselected',
    description: 'Label for the show selected features only checkbox',
    defaultMessage: 'Selected only'
  },
  filterplaceholder: {
    id: 'featuretable.filterplaceholder',
    description: 'Placeholder for filter expression input field',
    defaultMessage: 'Type filter expression'
  },
  filterhelptext: {
    id: 'featuretable.filterhelptext',
    description: 'filter help text',
    defaultMessage: 'ATTRIBUTE == "Value"'
  },
  filterlabel: {
    id: 'featuretable.filterlabel',
    description: 'Label for the filter expression input field',
    defaultMessage: 'Filter',
  },
  filterlabelselected: {
    id: 'featuretable.filterlabelselected',
    description: 'Label for the filter expression input field',
    defaultMessage: 'Filter SELECTED LAYER',
  },
  filterbuttontext: {
    id: 'featuretable.filterbuttontext',
    description: 'Text for the filter button',
    defaultMessage: 'Filter results based on your criteria'
  },
  filterlabelall: {
    id: 'featuretable.filterlabelall',
    description: 'Label for the filter expression input field',
    defaultMessage: 'Filter ALL LAYERS'
  },  
  filterlabelallbutton: {
    id: 'featuretable.filterlabelallbutton',
    description: 'Label for the filter expression input field',
    defaultMessage: 'Export to layer'
  },
  validatetitle: {
    id: 'featuretable.validatetitle',
    description: 'Title for the validate button',
    defaultMessage: 'Validate your metadata structure'
  },  
  exporttooltip: {
    id: 'featuretable.exporttooltip',
    description: 'Export query to new layer',
    defaultMessage: 'Export query to new layer'
  },
  previewtoggletext: {
    id: 'featuretable.previewtoggletext',
    description: 'Text for the move button',
    defaultMessage: 'Preview'
  }
});
/**
 * A table to show features. Allows for selection of features.
 *
 * ```javascript
 * var selectedLayer = map.getLayers().item(2);
 * ```
 *
 * ```xml
 * <FeatureTable ref='table' layer={selectedLayer} map={map} />
 * ```
 *
 * ![Feature Table](../FeatureTable.png)
 */
class FeatureTableTab extends React.Component {
  static propTypes = {
    /**
     * The ol3 map in which the source for the table resides.
     */
    map: React.PropTypes.instanceOf(ol.Map).isRequired,
    /**
     * The layer to use initially for loading the table.
     */
    layer: React.PropTypes.instanceOf(ol.layer.Layer),
    /**
     * The zoom level to zoom the map to in case of a point geometry.
     */
    pointZoom: React.PropTypes.number,
    /**
     * Refresh rate in ms that determines how often to resize the feature table when the window is resized.
     */
    refreshRate: React.PropTypes.number,
    /**
     * Number of features per page.
     */
    pageSize: React.PropTypes.number,
    /**
     * Css class name to apply on the root element of this component.
     */
    className: React.PropTypes.string,
    /**
     * @ignore
     */
    intl: intlShape.isRequired,
    /**
     * Optional fixed height in pixels.
     */
    height: React.PropTypes.number,
    /**
     * Should we allow for sorting the data?
     */
    sortable: React.PropTypes.bool,
    /**
     * Callback that gets called when the height needs updating of the parent container.
     */
    onUpdate: React.PropTypes.func
  };

  static contextTypes = {
    muiTheme: React.PropTypes.object,
    proxy: React.PropTypes.string,
    requestHeaders: React.PropTypes.object
  };

  static childContextTypes = {
    muiTheme: React.PropTypes.object.isRequired
  };

  static defaultProps = {
    pageSize: 20,
    pointZoom: 16,
    sortable: true,
    refreshRate: 250
  };

  constructor(props, context) {
    super(props);
    this._proxy = context.proxy;
    this._requestHeaders = context.proxy;
    this._onChange = this._onChange.bind(this);
    FeatureStore.bindMap(this.props.map, this._proxy);
    LayerStore.bindMap(this.props.map);
    this._selectedOnly = false;
    this._pagesLoaded = {};
    this._counter = 0;
    this.state = {
      expanded: !this.props.height,
      pageSize: props.pageSize,
      pages: -1,
      active: false,
      errorOpen: false,
      error: false,
      infoFilterOpen: false,
      infoFilterInProgress: false,
      muiTheme: context.muiTheme || getMuiTheme(),
      features: null,
      selected: null,
      help: false,

      Toggled: false,
      filteredRows: [],
      filterByExpression: '',
      queryFilter: null,
      queryFilterAuto: null,
      operator: '',
      searchText: '',
      searchText2: '',
      value: 1,
      filterActive: false,
      filterAllActive: false,
      featuresFromAllLayers: [],
      previousLayer: null,

      ids: 0,

      tabledivname: 'tabletab',
      resizeTo: 'tabs',
      class: 'tabletab',
      expandToggle: false,
      gridWidth: this.props.width,
      gridHeight: this.props.height,

      tableDiv: '',
      // icon: 'fa fa-expand',
      tablebuttontooltip: 'Expand table',
      tablebuttoncolor: false,
      fullscreentableinfo: '',
      expandButtonLabel: 'fullscreen',

      forceSpecsOnLayer: false
    };
  }
  componentWillMount() {
    FeatureStore.addChangeListener(this._onChange);
    this._onChange();
    this.setDimensionsOnState = debounce(this.setDimensionsOnState, this.props.refreshRate).bind(this);
  }
  componentDidMount() {
    this._element = ReactDOM.findDOMNode(this).parentNode;
    this._formNode = ReactDOM.findDOMNode(this.refs.form);
    this._attachResizeEvent();
    if (this.props.layer) {
      this._setLayer(this.props.layer);
      if (this.props.onUpdate) {
        this.props.onUpdate();
      }
    }
  }
  componentWillUnmount() {
    FeatureStore.removeChangeListener(this._onChange);
    global.removeEventListener('resize', this.setDimensionsOnState);
  }
  _attachResizeEvent() {
    global.addEventListener('resize', this.setDimensionsOnState);
  }
  setDimensionsOnState() {
    // force a re-render
    this.setState({});
  }
  _setLayer(layer) {
    this._layer = layer;
    if (layer !== null) {
      FeatureStore.addLayer(layer, this._selectedOnly, this._proxy, this._requestHeaders);
      if (!this._layer.get('numberOfFeatures')) {
        this._layer.once('change:numberOfFeatures', function() {
          this.setState({
            pages: Math.ceil(this._layer.get('numberOfFeatures') / this.state.pageSize)
          });
        }, this);
      }
    }
  }
  _onLayerSelectChange(layer) {
    // TODO add clearing filter back
    //ReactDOM.findDOMNode(this.refs.filter).value = '';
    this._setLayer(layer);

    // // ***this to try put selected layer in memory
    // this.setState({previousLayer: layer});
    
    // if (!this.state.expandedLayer) {
    //   this._setLayer(layer);
    // } else if (this.state.expandedLayer) {
    //   this._setLayer(this.state.expandedLayer);
    // }

    if (this.refs.table) {
      // start on first page
      this.refs.table.setPage(0);
      // store selected layer name for later use as key in expander (to store the selected layer otherwise switches back to first if expand/collapse)
      // this.setState({selectedLayer: this.refs.layerSelector.props.value});
    }
  }
  _onChange() {
    // if (this.state.filterActive) {
    // 	// this._setLayer(filterFeatures);
    // 	var temporaryLayer = this.props.map.getLayers().item(2);
    // 	this._setLayer(temporaryLayer);
    // }

    if (this._layer) {
      var state = FeatureStore.getState(this._layer);
      if (!state) {
        delete this._layer;
        return;
      }
      this.setState(state);
    } 
    // if (this._layer && !this.state.expandedLayer) {
    //   var state = FeatureStore.getState(this._layer);
    //   if (!state) {
    //     delete this._layer;
    //     return;
    //   }
    //   this.setState(state);
    // } else if (this.state.expandedLayer) {
    //   var state = FeatureStore.getState(this.state.expandedLayer);
    //   if (!state) {
    //     delete this.state.expandedLayer;
    //     return;
    //   }
    //   this.setState(state);
    // }
  }
  _filter(evt) {
    this._selectedOnly = evt.target.checked;
    this._updateStoreFilter();
  }
  _filterLayerList(lyr) {
    return lyr.get('title') !== null && (lyr instanceof ol.layer.Vector || lyr.get('wfsInfo') !== undefined);
  }
  _updateStoreFilter() {
    var lyr = this._layer;
    if (!this._filtered) {
      if (this._selectedOnly === true) {
        FeatureStore.setSelectedAsFilter(lyr);
      } else {
        FeatureStore.restoreOriginalFeatures(lyr);
      }
    } else {
      FeatureStore.setFilter(lyr, this._filteredRows);
    }
  }
  _clearSelected() {
    this.setState({searchText2: '', searchText: '', value: 1}, this._filterByText);
  }
  _zoomSelected() {
    var selected = this.state.selected;
    var len = selected.length;
    if (len > 0) {
      var extent = ol.extent.createEmpty();
      for (var i = 0; i < len; ++i) {
        extent = ol.extent.extend(extent, selected[i].getGeometry().getExtent());
      }
      var map = this.props.map;
      if (extent[0] === extent[2]) {
        map.getView().setCenter([extent[0], extent[1]]);
        map.getView().setZoom(this.props.pointZoom);
      } else {
        map.getView().fit(extent, map.getSize());
      }
    }
  }
  _generateId() {
    return 'temp-' + this._counter;
  }
  _filterByText() { 
  // _filterByText(evt) {  // this needed for textfield without autocomplete
    const {formatMessage} = this.props.intl;
    // var filterBy = evt.target.value; // traditional way with no autocomplete textfield.. and change back all filterByAuto to filterBy
    
	var map = this.props.map;
    // ***scenario temp layer: show all layer and clear filter layer if currently added to map
    var flatLayers = LayerStore.getState().flatLayers;
    for (var i = 0, ii = flatLayers.length; i < ii; ++i) {
      if (flatLayers[i] instanceof ol.layer.Vector) {
        FeatureStore.addLayer(flatLayers[i]);
        flatLayers[i].setVisible(true);
        // if (flatLayers[i].get('id') === 'sdk-layer-filterResults') {
        if (flatLayers[i].get('title') === 'filteredFeatures') {
          flatLayers[i].getSource().clear();
          map.removeLayer(flatLayers[i]);
        }
      }
    }
    // ***

    // this._setLayer(this.state.previousLayer);

    // get all feature from single or all layers
    if (this.state.filterAllActive) {
		var state = FeatureStore.getState(); //just get all feature objects in the state (see addLayer at beginning); for current layer that was "var state = FeatureStore.getState(this._layer);"
	    var rows = []; //originally was "var rows = this._selectedOnly ? state.selected : state.features.getFeatures();" but here problem because we have multiple objects with DIFFERENT layer names
	    // var rows = this._selectedOnly ? state.selected : rowsTwemp;
	    Object.keys(state).forEach(function(featuresCollection_) {
	      // var temp = state[featuresCollection_].features.featuresCollection_.array_;
	      var temp = state[featuresCollection_].features.getFeatures(); // this is the same as above line
	      for (var i = 0; i < temp.length; i++) {
	        rows.push(temp[i]);
	      }
	    });
	    this.setState({featuresFromAllLayers: rows});
    } else {
    	var state = FeatureStore.getState(this._layer);
    	var rows = this._selectedOnly ? state.selected : state.features.getFeatures();
    }

    // ***scenario skip unskip: unskip all previously skipped features
    // for (var i = 0, ii = rows.length; i < ii; ++i) {
    //   map.unskipFeature(rows[i]);
    // }
    // ***

    var filteredRows = [];
    var hideRows = []; // ***scenario skip unskip
    var queryFilter;

    if (this.state.searchText !== '' && this.state.operator !== '' && this.state.searchText2 !== '') {
	    var filterByAuto = this.state.searchText + this.state.operator + '"' + this.state.searchText2 + '"';
	    this.setState({filterByExpression: filterByAuto}); // later used for naming of new layer in create new layer method
	    if (filterByAuto !== '') {
	      try {
	        queryFilter = FilterService.filter(filterByAuto.replace(/'/g, '"'));
	      } catch (e) {
	        this.setState({
	          errorOpen: true,
	          error: true,
	          msg: formatMessage(messages.errormsg, {msg: e.message})
	        });
	        queryFilter = null;
	      }
	      if (queryFilter !== null) {
	        this.setState({
	          errorOpen: false,
	          error: false
	        });
	        for (var i = 0, ii = rows.length; i < ii; ++i) {
	          var row = rows[i];
	          if (row) {
	            var properties = rows[i].getProperties();
	            if (queryFilter(properties)) {
	              filteredRows.push(rows[i]);
	            }
	            // ***scenario skip unskip: populate hideRows to later skip
	            // else {
	            // 	hideRows.push(rows[i]);
	            // }
	            // ***
	          }
	        }
	      }
	    } 
	    // else {
	    //   filteredRows = rows;
	    // }
	    if (filteredRows.length > 0) { //filtered features exist!
            // ***scenario skip unskip: skip hideRows
         //    for (var i = 0, ii = hideRows.length; i < ii; ++i) {
	        //   map.skipFeature(hideRows[i]);
	        // }
	        // ***
        	
		    // ***scenario temp layer: hide all layers to only show the filter layer
	        var layersToHide = LayerStore.getState().flatLayers; //this line is not necessary but maybe good for my understanding, variable exists in above function, could also be passed in state
	        for (var i = 0, ii = layersToHide.length; i < ii; ++i) { //only hide layers of type vector
	          if (layersToHide[i] instanceof ol.layer.Vector) {
	            layersToHide[i].setVisible(false);
	            FeatureStore.removeLayer(layersToHide[i]); // remove it to only have new temp layer for render
	          }
	        }
	        // ***scenario temp layer: create new temporary layer with filtered features
	        this._counter++;
	        var filterFeatures = new ol.layer.Vector({
	          id: this._generateId(),
	          // id: 'sdk-layer-filterResults',
	          // style: style,
	          source: new ol.source.Vector({
	            features: filteredRows,
	            wrapX: false
	          }),
	          title: 'filteredFeatures',
	          isRemovable: true,
	          isSelectable: true
	        });
	        map.addLayer(filterFeatures);
	        // var ttt2 = FeatureStore.getState();
		    // ***scenario temp layer: make new layer show up in table
		    // FeatureStore.removeLayer(map.getLayers())
		    // FeatureStore.addLayer(filterFeatures); (already used in setLayer)
		    this._setLayer(filterFeatures); //in general only this needed, own layer now
		    // var ttt3 = FeatureStore.getState();
	        // this._onLayerSelectChange(filterFeatures);
		    // // LayerStore._bindLayer(filterFeatures);
		    // var statee = FeatureStore.getState();
		    // // ***ISSUE schema doesn't work the second run
		    // var tempSchema2 = FeatureStore.getSchema(filterFeatures); 
		    // // this._onLayerSelectChange(filterFeatures);
		    // // FeatureStore.bindLayer(filterFeatures);
	        this.setState({filteredRows: filteredRows}); //put filteredRows (queried features) into state so it can be used in method _createNewLayerFromQuery
	        // ***

	        // ***scenario skip unskip (or working with filtering on current layer in table): this following only needed when filtering current layer (not when new one is created)
		    // this._filtered = (rows.length !== filteredRows.length);
		    // this._filteredRows = filteredRows;
		    // FeatureStore.setFilter(this._layer, filteredRows);
		    // ***

		    this.setState({
	          infoFilterOpen: true,
	          infoFilterInProgress: true,
	          queryFilter: queryFilter, // to be used in create layer method (for single and all layers query)
  	          filterActive: true // used to be able to call sdk-layer-filterResults insteas sdk layer 1 in render for the selection of rows 
	        });
		    // toggle focus view if filter all layer
	        if (this.state.filterAllActive) {
	        	this.setState({Toggled: true}); //if filter expression is correct and executed toggle focus view (as different layers will have different coloums and it becomes a mess)
	        }

	    } else if (filteredRows.length === 0) { //no filtered features exist
	    	this.setState({
      		  infoFilterOpen: false,
		      infoFilterInProgress: false,
	          errorOpen: true,
	          error: true,
	          msg: 'error code: filter expression incorrect (no results)',
	          filterActive: false,
	          Toggled: false
	        });
	        if (this.state.filterAllActive) {
		      	this.setState({Toggled: false});
	        }	        

	        // ***scenario temp layer: apparently nothing needs to be done here in that scenario
	        // this._setLayer(this._layer);
	    	// ***

	        // ***scenario skip unskip (or working with filtering on current layer in table): 
	     //   	filteredRows = rows;
		    // this._filtered = (rows.length !== filteredRows.length);
		    // this._filteredRows = filteredRows;
		    // FeatureStore.setFilter(this._layer, filteredRows);
	        // ***
	    }
  	} else {
		this.setState({
		  infoFilterOpen: false,
	      infoFilterInProgress: false,
	      errorOpen: true,
		  error: true,
		  msg: 'error code: filter expression incomplete',
		  filterActive: false
		});
		// ***scenario temp layer: apparently nothing needs to be done here in that scenario
        // this._setLayer(this._layer);
    	// ***

    	// ***scenario skip unskip (or working with filtering on current layer in table): 
    	// filteredRows = rows;
	    // this._filtered = (rows.length !== filteredRows.length);
	    // this._filteredRows = filteredRows;
	    // FeatureStore.setFilter(this._layer, filteredRows);
	    // ***
  	}
  }
  _handleRequestClose() {
    this.setState({
      errorOpen: false
      // infoFilterOpen: false
    });
  }
  _handleRequestCloseActive() {
    this.setState({
      active: false
    });
  }
  setActive(active) {
    this.setState({active: active});
  }
  _onSelect(props) {
    SelectActions.toggleFeature(this._layer, props.row);
  }  
  // **************fabi testing mouse hover select on map
  // _onSelectHover(feature) {
  //   SelectActions.clear(this._layer, this._selectedOnly);
  //   SelectActions.toggleFeature(this._layer, feature);
  // }
  _onTableChange(state, instance) {
    if (!this._layer) {
      return;
    }
    const {formatMessage} = this.props.intl;
    this.setState({loading: true});
    var start = state.page * state.pageSize;
    FeatureStore.loadFeatures(this._layer, start, state.pageSize, state.sorting, function() {
      this.setState({
        page: state.page,
        pageSize: state.pageSize,
        pages: this._layer.get('numberOfFeatures') ? Math.ceil(this._layer.get('numberOfFeatures') / state.pageSize) : undefined,
        loading: false
      });
    }, function(xmlhttp, msg) {
      this.setState({
        error: true,
        errorOpen: true,
        msg: formatMessage(messages.loaderrormsg, {msg: msg || (xmlhttp.status + ' ' + xmlhttp.statusText)}),
        loading: false
      });
    }, this, this._proxy, this._requestHeaders);
  }
  _onExpandChange(expanded) {
    var me = this;
    // var actualLayer = me._layer;
    // if (expanded) {
    //   this.setState({expandedLayer: actualLayer});
    // }
    window.setTimeout(function() {
      me.setState({expanded: expanded}, function() {
        if (me.props.onUpdate) {
          me.props.onUpdate();
        }
      });
    });
  }
  _createNewLayerFromQuery(evt) {
    // remove the temp layer from layers list
    var map = this.props.map;
    // var flatLayers = LayerStore.getState().flatLayers;
    // for (var i = 0, ii = flatLayers.length; i < ii; ++i) {
    //   if (flatLayers[i] instanceof ol.layer.Vector) {
    //     FeatureStore.addLayer(flatLayers[i]);
    //     flatLayers[i].setVisible(true);
    //     if (flatLayers[i].get('title') === 'filteredFeatures') {
    //       flatLayers[i].getSource().clear();
    //       map.removeLayer(flatLayers[i]);
    //     }
    //   }
    // }
    // if (this.state.queryFilter !== null) {
    if (this.state.filterActive) {
      var map = this.props.map;
      var layersToHide = LayerStore.getState().flatLayers; //this line is not necessary but maybe good for my understanding, variable exists in above function, could also be passed in state
      for (var i = 0, ii = layersToHide.length; i < ii; ++i) { //only hide layers of type vector
        if (layersToHide[i] instanceof ol.layer.Vector) {
          if (layersToHide[i].get('title') === 'filteredFeatures') {
	          layersToHide[i].getSource().clear();
	          map.removeLayer(layersToHide[i]);
        	}
          layersToHide[i].setVisible(false);
        }
      }
      this.setState({ids: ++this.state.ids}); //id counter (increment value) for new layers
      // ***keep required properties, remove all additional
      var testFeatures = this.state.filteredRows;
      var testGeoJsonData = new ol.format.GeoJSON().writeFeaturesObject(testFeatures);
      var ajv = Ajv({ removeAdditional: "all" }); //using true instead of "all" didnt work. See https://github.com/epoberezkin/ajv Filtering data
      // var schemaFile = require('../schema/json-schema-aoi.json');
      var schemaFile = require('../schema/json-schema-geojson-map.json');
      var validate = ajv.compile(schemaFile);
      var finalRemove = validate(testGeoJsonData);
      var featuresAdditionalRemoved = new ol.format.GeoJSON().readFeatures(testGeoJsonData); //use this for features in new layer source
      // removeAdditional end***
      var lyr = new ol.layer.Vector({
          id: this.state.ids.toString(), //LayerSelector wants id as string
          // style: style,
          source: new ol.source.Vector({
              features: featuresAdditionalRemoved,
              // features: this.state.filteredRows,
              // features: this.getState(filteredRows), //what is the difference between this.state... and this.getState...??????
              wrapX: false
          }),
          title: "New Layer (" + this.state.ids + ") from Query (" + this.state.filterByExpression + ")",
          isRemovable: true,
          isSelectable: true
          // showDownload: true //doesnt show! why? would like to have that option here but would need to do it over state
      });
      map.addLayer(lyr);

      // !!learn to use events to reset everything and use new export layer for display!!
      // !!then get rid of crap below
      
      // this.setState({Toggled: false}); //a) reset focus view
      //b) invoke the new layer as selected in LayerSelector (should also display the corresponding rows in table)
      //c) clear/reset _filterAllByText text area
      //d) invoke show/open map panel LayerList
      // this.setState({queryFilter: null}); //at the end update state to null so that button cannot be clicked again

      // this._setLayer(lyr); //display new layer features in table
      //but it should be possible with a LayerSelector method!

      //sdk, app dispatcher
      //flux (framework to manage events)
      //they all passt hrough app dispatcher 

      //*********************************
      //erste und wichtigste frage hier.. wie kann ich diese methods von anderen components hier benutzen
      //zb:
        //LayerList._showPanel(evt);
        //LayerSelector._onItemChange
      //******************ODER geht es eben doch ueber layerselector unten und ich muss das eingach nur raffen

      //*************this is trying to make selection on dropddown
    //var gdd = LayerSelector.getState();
      //LayerSelector._onItemChange(evt, {index: this.state.ids}, {value: this.state.ids.toString()});


//unten bei layerselector value={id} anstelle id ... this.state.ids.toString() nehmen
//irgendwie da ist wahrscheinlich auch die loesung
//aber der nimmt die ganze zeit weiterhin die 'polygons', also kann value auch nicht wirklich das entscheidende sein

      // reset view bzw switch to new layer in layerslist!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 
      //show metadata in table is already done in method above

      // get features from state ids and filteredRows above?!?!?
        //1. clear text in filter all layers box
        //2. select new layer in layerslist and coupled with that display in table (if problem do with this.state.filteredRows)
        //3. open layerslist (map) automatically


        // floatingLabelText={formatMessage(messages.filterlabelall)}
      //evt.target.value = null;
      // this._filterAllByText(null);



      // filteredRows = FeatureStore.getState(this._layer).originalFeatures; 
      // this.setState({Toggled: false});  
      
      // // filteredRows = FeatureStore.getState(this._layer).originalFeatures; //have it already no??
     //    this.setState({Toggled: false}); //reset focus view to toggle off (there is only focus view coloumns anyways)
     //    // this._filtered = (rows.length !== filteredRows.length);
      // this._filteredRows = this.state.filteredRows;
      // FeatureStore.setFilter(this._layer, this.state.filteredRows);
    } else {
    	this.setState({
	    errorOpen: true,
		  error: true,
		  msg: 'error code: filter expression incomplete'
		});
    }
  }
  handleToggle() {
    this.setState({Toggled: !this.state.Toggled});
  }
  tablefullscreentoggle() {
    if (this.state.tableDiv === '') {
      // var widthPixCalc = this._element.offsetWidth;
      this.setState({tableDiv: 'tablefullscreen', expandButtonLabel: 'collapse', icon: 'fa fa-compress', tablebuttontooltip: 'Compress table', tablebuttoncolor: true, fullscreentableinfo: 'Fullscreen Table and Query'});
      this.setDimensionsOnState();
      // this.setState({widthPixCalc: this._element.offsetWidth});
    } else if (this.state.tableDiv === 'tablefullscreen') {
      this.setState({tableDiv: '', expandButtonLabel: 'fullscreen', icon: 'fa fa-expand', tablebuttontooltip: 'Expand table', tablebuttoncolor: false, fullscreentableinfo: ''});
      this.setDimensionsOnState();
      // this.setState({widthPixCalc: this._element.offsetWidth});
    }
  }

  handleUpdateInput = (searchText) => {
    this.setState(
    	{searchText: searchText},
    	function () {
    		this._filterByText();
    	}
    );
    // if (searchText == '') {
    // 	this.handleNewRequest();
    // }
    // if (this.state.searchText !== '' && this.state.operator !== '' && this.state.searchText2 !== '') {
    	// this._filterByText();
    // }
  };  
  // handleNewRequest = () => {
  //   // this.setState({
  //   //   searchText: '',
  //   // });
  //   this._filterByText();
  // };
  handleUpdateInput2 = (searchText2) => {
    this.setState(
    	{searchText2: searchText2},
    	function () {
    		this._filterByText();
    	}
    );
    // if (this.state.searchText !== '' && this.state.operator !== '' && this.state.searchText2 !== '') {
    	// this._filterByText();
    // }
  };

  handleChange = (event, index, value) => {
  	this.setState(
  		{value: value, operator: event.target.innerHTML},
  		function () {
  			this._filterByText();
  		}
  	);
  	// this._filterByText();
  }

  handleCheck() {
  	this.setState({filterAllActive: !this.state.filterAllActive});
  	if (!this.state.filterAllActive) {
  		var flatLayers = LayerStore.getState().flatLayers;
	    for (var i = 0, ii = flatLayers.length; i < ii; ++i) {
	      if (flatLayers[i] instanceof ol.layer.Vector) {
	        FeatureStore.addLayer(flatLayers[i]); // needed for feature store to be up to date without selecting each with layer selector
	      }
	  }}
	  this.handleToggle();
  }

  _onSelect2() {
  	console.log('bla');
  }

  enforceSpecs() {
	  let originalSchema = FeatureStore.getSchema(this._layer);
	  //how to back up and restore original schema?? bzw make onlu for this layer and not all schemas again
	  let ajv2 = Ajv({ removeAdditional: "all", useDefaults: true }); //using true instead of "all" didnt work. See https://github.com/epoberezkin/ajv Filtering data
    // let schemaFile2 = require('../schema/json-schema-aoi-simple.json');
    let schemaFile2 = require('../schema/json-schema-onlySchema-map.json');
    let validate2 = ajv2.compile(schemaFile2);
    let finalRemove2 = validate2(originalSchema);

  	this.setState({forceSpecsOnLayer: !this.state.forceSpecsOnLayer});

  	// for (var key in originalSchema) {
   //      if (originalSchema[key] === 'link') {
   //        columns.push({
   //          id: key,
   //          header: key,
   //          sortable: sortable,
   //          render: (function(props) {
   //            return (<a href={props.row.get(this)}>{props.row.get(this)}</a>);
   //          }).bind(key)
   //        });
   //      } else {
   //        columns.push({
   //          id: key,
   //          header: key,
   //          sortable: sortable,
   //          accessor: (function(d) {
   //            return d.get(this);
   //          }).bind(key)
   //        });
   //      }
   //    }
	  
  }

  clearQueryEvent() {
  	AppDispatcher.dispatch({
      action: {
        type: 'add-activation', //clear-query
        activation: act_data
     }
    });
  }

  render() {
    const {formatMessage} = this.props.intl;
    var schema, id;
    var allLayers = LayerStore.getState().flatLayers;
    if (this._layer) {
      // if (this._layer.get('id') === 'sdk-layer-filterResults') {
      // 	// var newState = FeatureStore.getState(this._layer);
      // 	FeatureStore.getState(this._layer);
      // 	schema = FeatureStore.getSchema(this._layer);
      // } else {
      schema = FeatureStore.getSchema(this._layer);
      id = this._layer.get('id');
  	  // }

      // !!this only test to backup schema
      // var feature = this._config[id].features.getFeatures()[0];
      // var sampleFeature = this.state.features.getFeatures()[0];
      // var values = sampleFeature.getProperties();
      // then maybe use setProperties later again to restore
    }
    var error;
    if (this.state.error === true) {
      error = (<Snackbar
        autoHideDuration={5000}
        style={{transitionProperty : 'none'}}
        bodyStyle={{lineHeight: '24px', height: 'auto'}}
        open={this.state.errorOpen}
        message={this.state.msg}
        onRequestClose={this._handleRequestClose.bind(this)}
      />);
    }    
    var infoFilterInProgress;
    if (this.state.infoFilterInProgress === true) {
      infoFilterInProgress = (<Snackbar
        style={{transitionProperty : 'none'}}
        bodyStyle={{lineHeight: '24px', height: 'auto'}}
        open={this.state.infoFilterOpen}
        message='Filter active'
        onRequestClose={this._handleRequestClose.bind(this)}
      />);
    }

    // if (this.state.filterActive) {
    // 	LayerStore._bindLayer('sdk-layer-filterResults');
    // 	var me = this.state.thisObject;
    // }
    var me = this;
    var sortable = this.props.sortable;
    // columns and headers START**********************
    var columns = [{
      id: 'selector',
      header: '',
      sortable: sortable,
      render: function(props) {
        var selected = me.state.selected.indexOf(props.row) !== -1;
        return (<Checkbox disableTouchRipple={true} checked={selected} onCheck={me._onSelect.bind(me, props)} />);
        
        // return (<Checkbox disableTouchRipple={true} checked={selected} onCheck={me._onSelect2.bind(this)} />);
       //  if (me.state.filterActive) {
       //  	return (<Checkbox disableTouchRipple={true} checked={selected} onCheck={me._onSelect.bind(me, props)} />);
      	// } else {
       //  	return (<Checkbox disableTouchRipple={true} checked={selected} onCheck={me._onSelect.bind(me, props)} />);
      	// }
      }
    }];
    // var columnsAll = [];
    // if (this.state.filterAllActive) {
	   //  var flatLayers = LayerStore.getState().flatLayers;
	   //  for (var i = 0, ii = flatLayers.length; i < ii; ++i) {
	   //    if (flatLayers[i] instanceof ol.layer.Vector) {
	   //      // schemaThroughAll.push(FeatureStore.getSchema(flatLayers[i]));
	   //      var tempp = FeatureStore.getSchema(flatLayers[i]);
	   //      for (var key in tempp) {
	   //      	columnsAll.push(key);
	   //      }
	   //    }
	   //  }
    // }

    if (this.state.Toggled === false) {
      for (var key in schema) {
        if (schema[key] === 'link') {
          columns.push({
            id: key,
            header: key,
            sortable: sortable,
            render: (function(props) {
              return (<a href={props.row.get(this)}>{props.row.get(this)}</a>);
            }).bind(key)
          });
        } else {
          columns.push({
            id: key,
            header: key,
            sortable: sortable,
            accessor: (function(d) {
              return d.get(this);
            }).bind(key)
          });
        }
      }
    } else if (this.state.Toggled) { 
        // current implementation for FILTER ALL: 
        // only the specified columns can be filtered and will be shown, otherwise new table will be a chaos
        // var checkIfAllLayers = FeatureStore.getState();
        // var allLayers = LayerStore.getState().flatLayers;
        
        // for (var i = 0, ii = allLayers.length; i < ii; ++i) { //only hide layers of type vector
        //   if (allLayers[i] instanceof ol.layer.Vector) {
        //     // console.log(allLayers[i].get('id'));
        //     // console.log(FeatureStore.getSchema(allLayers[i]));
        //     var schemaAll = FeatureStore.getSchema(allLayers[i]);
        //     for (var key in schemaAll) {
        //       if (key == "status_id" || key == "metadata_type" || key == "name_of_aoi" || key == "planned_map_type" || key == "planned_satellite_data") {
        //         columns.push({
        //           id: key,
        //           header: key,
        //           sortable: sortable,
        //           accessor: (function(d) {
        //             return d.get(this);
        //           }).bind(key)
        //         });
        //       }
        //     }
        //   }
        // }

	      //A)*****************js style filtering, non destructive*****************************
        var currentLayerListItem = id;
        for (var i = 0, ii = allLayers.length; i < ii; ++i) {
        	if (allLayers[i].get('id') == currentLayerListItem) {
        		
        		var schemaCurrent = FeatureStore.getSchema(allLayers[i]);

        		var ajv = Ajv({ useDefaults: true });
			      // var schemaFile = require('../schema/json-schema-aoi-simple.json');
			      var schemaFile = require('../schema/json-schema-onlySchema-map.json');
			      var validate = ajv.compile(schemaFile);
			      var addMissingProps = validate(schemaCurrent);

            for (var key in schemaCurrent) {
              // if (key == "status_id" || key == "metadata_type" || key == "name_of_aoi" || key == "planned_map_type" || key == "planned_satellite_data") {
              if (key == "status" || key == "metadata_type" || key == "name" || key == "map_type" || key == "production_site" || key == "availability" || key == "product_link") {
                columns.push({
                  id: key,
                  header: key,
                  sortable: sortable,
                  accessor: (function(d) {
                    return d.get(this);
                  }).bind(key)
                });
              }
            }
        	}
        }
    } 
        // var currentLayerListItem = id;
        // for (var i = 0, ii = allLayers.length; i < ii; ++i) {
        // 	if (allLayers[i].get('id') == currentLayerListItem) {
        // 		var schemaAll = FeatureStore.getSchema(allLayers[i]);
        // 		var keys = ["status_id", "metadata_type", "name_of_aoi", "planned_map_type", "planned_satellite_data"];
        //     for (var key in schemaAll) {
        //         columns.push({
        //           id: key,
        //           header: key,
        //           sortable: sortable,
        //           accessor: (function(d) {
        //             return d.get(this);
        //           }).bind(key)
        //         });
        //       }
        // 	}
        // }

        // !!!the problem here is that it modifies original schema eventhough I try to put it in variable
        // maybe put in method and invoke from here and maybe from query all (call it enforceSpecs) or combine with query all (although it is a different step)
        // indicate warning that original data will be modified
        // need to backup the original data to restore when foxus view is unchecked
        // otherwise working very well: additional are removed, missing are added, and for changes ONLY schema files needs to be adjusted
	      //B) *****************enforce comply, destructive to metadata*****************************
		      // var currentLayerListItem = id;
	       //  for (var i = 0, ii = allLayers.length; i < ii; ++i) {
	       //  	if (allLayers[i].get('id') == currentLayerListItem) {
	       //  		// var schema = FeatureStore.getSchema(allLayers[i]);
	       //  		// var originalSchema = FeatureStore.getSchema(allLayers[i]);
	       //  		let originalSchema = schema;
				    //   var ajv = Ajv({ removeAdditional: "all", useDefaults: true }); //using true instead of "all" didnt work. See https://github.com/epoberezkin/ajv Filtering data
				    //   var schemaFile = require('../schema/json-schema-aoi-simple.json');
				    //   var validate = ajv.compile(schemaFile);
				    //   var finalRemove = validate(originalSchema); //updated schema with additional removed
	       //      for (var key in originalSchema) {
	       //        columns.push({
	       //          id: key,
	       //          header: key,
	       //          sortable: sortable,
	       //          accessor: (function(d) {
	       //            return d.get(this);
	       //          }).bind(key)
	       //        });
	       //      }
	       //  	}
	       //  }

        // !!!now the part for filtering multiple layers
        // BUT is it necessary? Can't I build the filtered layer before, with all the features, and then it can be treated as one layer (see above)
        // if (filterAllActive) {
        // 	for (var i = 0, ii = allLayers.length; i < ii; ++i) { //only hide layers of type vector
	       //    if (allLayers[i] instanceof ol.layer.Vector) {
	       //      var schemaAll = FeatureStore.getSchema(allLayers[i]);
	       //      for (var key in schemaAll) {
	       //        if (key == "status_id" || key == "metadata_type" || key == "name_of_aoi" || key == "planned_map_type" || key == "planned_satellite_data") {
	       //          columns.push({
	       //            id: key,
	       //            header: key,
	       //            sortable: sortable,
	       //            accessor: (function(d) {
	       //              return d.get(this);
	       //            }).bind(key)
	       //          });
	       //        }
	       //      }
	       //    }
        // 	}
        // }
    // **********************columns and headers END
    // }
    var colHeads = [];
    // var dataAll = [];
    var dataAll = this.state.featuresFromAllLayers;
    if (!this.state.filterAllActive) {
	    for (var i = 0, ii = columns.length; i < ii; ++i) {
	    	colHeads.push(columns[i].id);
	    }
	} else if (this.state.filterAllActive) {
		var flatLayers = LayerStore.getState().flatLayers;
	    for (var i = 0, ii = flatLayers.length; i < ii; ++i) {
	      if (flatLayers[i] instanceof ol.layer.Vector) {
	        var tempSchema = FeatureStore.getSchema(flatLayers[i]);
	        // var tempFeaturesState = FeatureStore.getState(flatLayers[i]);
	        for (var key in tempSchema) {
	        	colHeads.push(key);
	        }
	        // dataAll.push(FeatureStore.getState(flatLayers[i]).features.getFeatures());
	      }
	    }
	}

    var cellsArray = [];
    var table;
    if (this._element && columns.length > 0 && this.state.features !== null) {
      var height = this.props.height ? this.props.height : this._element.offsetHeight - this._formNode.offsetHeight;
      if (this.state.expanded && this.props.height) {
        height = this.props.height - this._formNode.offsetHeight;
      }
      var data;
      if (this._filtered || this._selectedOnly) {
        data = this.state.filter;
      } else {
          if (this.state.filterAllActive && !this.state.filterActive) {
          	console.log('all');
          	var allFeatures = FeatureStore.getState();
				    var rows = []; //originally was "var rows = this._selectedOnly ? state.selected : state.features.getFeatures();" but here problem because we have multiple objects with DIFFERENT layer names
				    // var rows = this._selectedOnly ? state.selected : rowsTwemp;
				    Object.keys(allFeatures).forEach(function(featuresCollection_) {
				      // var temp = state[featuresCollection_].features.featuresCollection_.array_;
				      var temp = allFeatures[featuresCollection_].features.getFeatures(); // this is the same as above line
				      for (var i = 0; i < temp.length; i++) {
				        rows.push(temp[i]);
				      }
				    });
				    data = rows;
          } else {
	        		if (this._layer instanceof ol.layer.Vector) {
		          	data = this.state.features.getFeatures();
		          } else {
			          data = FeatureStore.getFeaturesPerPage(this._layer, this.state.page, this.state.pageSize);
			        }
      		}
      }
	  // cellsarray is for autocomplete
	  if (this.state.searchText !== '') {
		  var selectedHeader = this.state.searchText;
		  if (!this.state.filterAllActive) {
			  for (var i = 0, ii = data.length; i < ii; ++i) {
		  	    cellsArray.push(data[i].get(selectedHeader));
			  }
		  } else {
		  	  for (var i = 0, ii = dataAll.length; i < ii; ++i) {
		  	    cellsArray.push(dataAll[i].get(selectedHeader));
		  	    // var test = dataAll[i];
		  	    // for (var x in test) {
		  	    // 	cellsArray.push(test[x].get(selectedHeader));
		  	    // }
			  }
		  }
	  }
      table = (<ReactTable
        ref='table'
        loading={this.state.loading}
        pages={this._layer instanceof ol.layer.Vector ? undefined : this.state.pages}
        data={data}
        showPagination={false}
        manual={!(this._layer instanceof ol.layer.Vector)}
        showPageSizeOptions={false}
        onChange={(this._layer instanceof ol.layer.Vector) ? undefined : this._onTableChange.bind(this)}
        showPageJump={false}
        // pageSize={this.state.pageSize}
        pageSize={data.length}
        tableStyle={{width: '98%'}}
        style={{height: height, overflowY: 'auto', fontFamily: 'Arial', fontSize: '14px'}}
        columns={columns}
        // pivotBy={['status_id']}
        // **************fabi testing mouse hover select on map
        // onTrMouseEnter={(e) => {
        //   // return console.log(e.values_.component_name)
        //   // SelectActions.clear(this._layer, this._selectedOnly);
        //   // SelectActions.toggleFeature(this._layer, e);
        //   // this.props.row = {e};
        //   this._onSelectHover(e);
        //   // return 
        // }}
        onTrClick={(props) => {
          // me._onSelect.bind(me, props);
          SelectActions.toggleFeature(this._layer, props);
      //     // return console.log(props)
      //     return {
		    //   style: {
		    //     background: 'red'
		    //   }
		    // }
		    // return style={trStyle: {background: 'red'}}
		    // return (<ReactTable trStyle={{background: 'red'}} />)
		    // return (<TrComponent style={{background: 'red'}} />)
		    // return (<tr {...props} style={{background: 'red'}} />)
        }}
        // getTdProps={(state, rowInfo, column, instance) => {
        //   return console.log(state, rowInfo, column, instance)
        //   }
        // }

        // getTdProps={(state, rowInfo, column, instance) => {
        //   console.log('hello')
        //   return {
        //     onClick: e => {
        //       console.log('A Td Element was clicked!')
        //       console.log('it produced this event:', e)
        //       console.log('It was in this column:', column)
        //       console.log('It was in this row:', rowInfo)
        //       console.log('It was in this table instance:', instance)
        //     }
        //   }
        // }}          
      />);
    }
    var uniqueCols = [...new Set(colHeads)];
    var uniqueCells = [...new Set(cellsArray)].sort(); // originally, just using cellsArray is fine, but this eliminates dublicates in autocomplete
    var filterHelp = this._layer ? <FilterHelp intl={this.props.intl} /> : undefined;
    return (
      <Paper zDepth={0} className={classNames('sdk-component feature-table', this.state.tableDiv)}> {/**style={{width: this.state.widthPixCalc}}**/} {/**this.props.className**/}
        <Snackbar
          autoHideDuration={5000}
          open={!this._layer && this.state.active}
          bodyStyle={{lineHeight: '24px', height: 'auto'}}
          style={{bottom: 'auto', top: 0, position: 'absolute'}}
          message={formatMessage(messages.nodatamsg)}
          onRequestClose={this._handleRequestCloseActive.bind(this)}
        />
        <Card containerStyle={{ paddingBottom: 0 }} initiallyExpanded={!this.props.height} onExpandChange={this._onExpandChange.bind(this)} ref='form'>
          {/**<CardHeader title={formatMessage(messages.optionslabel)} actAsExpander={false} showExpandableButton={false} />**/}
          <CardText style={{padding: '0px'}} expandable={false}>
            
            <div className='headerAdjust'>{this.state.fullscreentableinfo}</div>
            <div className='feature-table-options'>
              <div className='feature-table-selector' style={{display: this.props.layer ? 'none' : 'block'}}>
                <LayerSelector {...this.props} id='table-layerSelector' disabled={!this._layer || this.state.filterAllActive} ref='layerSelector' onChange={this._onLayerSelectChange.bind(this)} filter={this._filterLayerList} map={this.props.map} value={id} />
	              <RaisedButton style={{width: 150}} label="filter all" secondary={this.state.filterAllActive} tooltip={'Filter all layers'} disabled={!this._layer} onTouchTap={this.handleCheck.bind(this)} disableTouchRipple={true}/>
              </div>
              <div className='filter-autocomplete'>
	              	<AutoComplete
					          listStyle={{maxHeight: 400}}
					          style={{bottom: '-8px', width: '40%'}}
					          hintText="with autocomplete"
					          searchText={this.state.searchText}
					          onUpdateInput={this.handleUpdateInput}
					          dataSource={uniqueCols}
					          filter={(searchText, key) => (key.indexOf(searchText) !== -1)}
					          openOnFocus={true}
					          floatingLabelText="Key"
					        />
				        <DropDownMenu value={this.state.value} onChange={this.handleChange} onClose={this.handleNewRequest} openImmediately={false}>
						      <MenuItem value={1} primaryText="Condition:" />
						      <MenuItem value={2} label="equals" primaryText="==" />
						      <MenuItem value={3} label="not equal" primaryText="!=" />
						      <MenuItem value={4} label="contains" primaryText="like" />
						      <MenuItem value={5} primaryText="Weekly" />
					    	</DropDownMenu>
				        <AutoComplete
						      listStyle={{maxHeight: 400, width: 500}}
						      style={{bottom: '-8px', width: '40%'}}
						      floatingLabelText="Value"
						      hintText="with autocomplete"
						      searchText={this.state.searchText2}
						      filter={AutoComplete.fuzzyFilter}
						      dataSource={uniqueCells}
						      openOnFocus={true}
						      onUpdateInput={this.handleUpdateInput2}
					    	/>

              </div>
            </div>
            <Toolbar className='feature-table-toolbar' >
							<ToolbarGroup firstChild={true}>
								<Checkbox style={{width: '25px'}} id='featuretable-onlyselected' disabled={!this._layer} checked={this._selectedOnly} onCheck={this._filter.bind(this)} disableTouchRipple={true}/>
              	<RaisedButton style={{minWidth: '40px'}} disabled={!this._layer} icon={<ActionSearch />} tooltip={formatMessage(messages.zoombuttontitle)} onTouchTap={this._zoomSelected.bind(this)} disableTouchRipple={true}/>
              	<RaisedButton style={{minWidth: '40px'}} disabled={!this._layer} icon={<ClearIcon />} tooltip={formatMessage(messages.clearbuttontitle)} onTouchTap={this._clearSelected.bind(this)} disableTouchRipple={true}/>
              	<RaisedButton style={{minWidth: '40px'}} secondary={this.state.tablebuttoncolor} icon={<i className='fa fa-expand'></i>} tooltip={'Toggle fullscreen table'} disabled={!this._layer} onTouchTap={this.tablefullscreentoggle.bind(this)} disableTouchRipple={true}/>
              	<RaisedButton style={{minWidth: '40px'}} icon={<i className='fa fa-times'></i>} tooltip={'Test clear filter'} disabled={!this._layer} onTouchTap={this.clearQueryEvent.bind(this)} disableTouchRipple={true}/>
              </ToolbarGroup>
							<ToolbarGroup lastChild={true}>
              	<ToolbarSeparator style={{marginLeft: '20px', marginRight: '20px'}} />
              	<Toggle className='toggle' style={{width: 100}} label={formatMessage(messages.previewtoggletext)} toggled={this.state.Toggled} onToggle={this.handleToggle.bind(this)} />
              	<RaisedButton style={{minWidth: '40px', verticalAlign: 'inherit'}} icon={<i className='fa fa-exclamation-triangle'></i>} tooltip={'Enforce specs on current metadata (cannot be undone)'} disabled={!this._layer} onTouchTap={this.enforceSpecs.bind(this)} disableTouchRipple={true}/>
              	<RaisedButton style={{minWidth: '40px'}} secondary={this.state.filterActive} disabled={!this._layer} icon={<DownloadIcon />} tooltip={formatMessage(messages.exporttooltip)} onTouchTap={this._createNewLayerFromQuery.bind(this)} disableTouchRipple={true}/>
            	</ToolbarGroup>
            </Toolbar>
          </CardText>
          {error}
          {infoFilterInProgress}
        </Card>
        {table}
      </Paper>
    );
  }
}

export default injectIntl(FeatureTableTab, {withRef: true});