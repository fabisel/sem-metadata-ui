// node module tree
import React from 'react';
import ReactDOM from 'react-dom';
import injectTapEventPlugin from 'react-tap-event-plugin';
import enLocaleData from 'react-intl/locale-data/en.js';
import {addLocaleData, IntlProvider, defineMessages, injectIntl, intlShape} from 'react-intl';
import ol from 'openlayers';
// boundless sdk
import Zoom from 'boundless-sdk/components/Zoom';
import MapPanel from 'boundless-sdk/components/MapPanel';
import enMessages from 'boundless-sdk/locale/en.js';
import Navigation from 'boundless-sdk/components/Navigation';
import Select from 'boundless-sdk/components/Select';
import LoadingPanel from 'boundless-sdk/components/LoadingPanel';
import HomeButton from 'boundless-sdk/components/HomeButton';
import Geolocation from 'boundless-sdk/components/Geolocation';
import Globe from 'boundless-sdk/components/Globe';
import LayerList from 'boundless-sdk/components/LayerList';
import AddLayer from 'boundless-sdk/components/AddLayer';
// own-components
import AddLayerValidateTab from './components/AddLayerValidateTab.jsx';
import FeatureTableTab from './components/FeatureTableTab.jsx'
// import LayerList from './own-components/LayerListBase.jsx';
// import AddLayer from './own-components/AddLayerValidate.jsx';
// import LayerListPlus from './own-components/LayerListPlus.jsx';
//material-ui
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import Drawer from 'material-ui/Drawer';
import MenuItem from 'material-ui/MenuItem';
import RaisedButton from 'material-ui/RaisedButton';
import {Tabs, Tab} from 'material-ui/Tabs';
import {GridList, GridTile} from 'material-ui/GridList';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import AppBar from 'material-ui/AppBar';

// Needed for onTouchTap
// Can go away when react 1.0 release
// Check this repo:
// https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();
addLocaleData(
        enLocaleData
        );

//*******************************************************************************************
//*******************************LAYERS*************************************************
// this is only to have a layer from the start (for quicker testing)
// remember to also add it again at map layer below
// remember to switch source between react local and django wrap
// var polygons = new ol.layer.Vector({
//     type: 'initial',
//     id: 'polygons',
//     isSelectable: true,
//     title: 'Polygons',
//     source: new ol.source.Vector({
//         // for react only testing
//         //url: 'data/test-activation.geojson',
//          // url: 'data/polygons-aoi-sample(fromQGIS).geojson',
//         // for django testing
//         url: '/static/polygons-aoi-sample(fromQGIS).geojson',
//         format: new ol.format.GeoJSON()
//     })
// });
var baseLayers = new ol.layer.Group({
    type: 'base-group',
    title: 'Base maps',
    layers: [
        new ol.layer.Tile({
            type: 'base',
            title: 'OSM Streets',
            visible: false,
            source: new ol.source.OSM()
        }),
        new ol.layer.Tile({
          type: 'base',
          title: 'CartoDB light',
          // visible: false,
          source: new ol.source.XYZ({
            url: 'http://s.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            attributions: [
              new ol.Attribution({
                html: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
              })
            ]
          })
        }),
        new ol.layer.Tile({
          type: 'base',
          title: 'CartoDB dark',
          visible: false,
          source: new ol.source.XYZ({
            url: 'http://s.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            attributions: [
              new ol.Attribution({
                html: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
              })
            ]
          })
        }),
        new ol.layer.Tile({
            type: 'base',
            title: 'ESRI world imagery',
            visible: false,
            source: new ol.source.XYZ({
                attributions: [
                    new ol.Attribution({
                        html: ['Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community']
                    })
                ],
                url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            })
        })
    ]
})
// **INITIALIZE MAP**
var map = new ol.Map({
    controls: [new ol.control.Attribution({collapsible: false}), new ol.control.ScaleLine()],
    // layers: [baseLayers, polygons],
   layers: [baseLayers],
    view: new ol.View({
        center: [0, 0],
        zoom: 4
    })
});
// **FIT VIEW TO GEOJSON EXTENT**
//var source = polygons.getSource();
//var onChangeKey = source.on('change', function () {
//    if (source.getState() == 'ready') {
//        source.unByKey(onChangeKey);
//        map.getView().fit(source.getExtent(), map.getSize());
//    }
//});
// **two variables to handle either all basemaps or all polygon layers**
var filterBaseLayersIn = lyr => {
  return (
    lyr.get('type') === 'base-group' || lyr.get('type') === 'base'
  );
};
var filterBaseLayersOut = lyr => {
  return (
    lyr.get('type') !== 'base-group' && lyr.get('type') !== 'base'
  );
};

class MyApp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
          value: 1
        };
    }
    getChildContext() {
        return {
            muiTheme: getMuiTheme()
        };
    }
    // handleChange(value) {
    //     // this.refs.layers.getWrappedInstance().setActive(value === 1);
    //     this.refs.table.getWrappedInstance().setActive(value === 1);
    //     if (value === parseInt(value, 10)) {
    //       this.setState({
    //         value: value,
    //       });
    //     }
    // }
    handleChange = (value) => {
      this.setState({
        value: value,
      });
    };
    // style={{justifyContent: "center", alignItems: "center"}}
    //<Scrollbars style={{ width: 500, height: 300 }}>
    render() {
      return (
        <div id='content'>           
          <div className="row container" id="fullrow">
            <div className="col tabs" id="tabspanel">

              <AppBar title="IWG-SEM Metadata Explorer & Validator" showMenuIconButton={false} titleStyle={{paddingTop: 20, textAlign: 'center'}} style={{height: 100}} zDepth={0} />

                <Tabs 
                  id="tabs"
                  value={this.state.value}
                  onChange={this.handleChange.bind(this)}
                >
                  <Tab disableTouchRipple={true} value={1} label="Add Data & Validate" >
                    <div className='upload-tab-container'>
                      <div id='upload-tab'>
                          <AddLayerValidateTab map={map} />
                      </div>
                    </div>
                  </Tab>
                  <Tab disableTouchRipple={true} value={2} label="Layers List">
                    <div id='layerlist'>
                      {/**<LayerListPlus filter={filterBaseLayersOut} allowLabeling={true} allowStyling={true} expandOnHover={false} showOnStart={true} showOpacity={true} showDownload={true} showGroupContent={true} showZoomTo={true} allowReordering={true} map={map} />**/}
                      <div id='vectorlayers'>
                          {/**allowLabeling={true}**/}
                          {/**showTable={true}**/}
                        <LayerList 
                          allowEditing={true}
                          allowFiltering={false}
                          allowRemove={true}
                          allowReordering={true}
                          allowStyling={true}
                          filter={filterBaseLayersOut}
                          map={map} 
                          showDownload={true}
                          showGroupContent={true}
                          showOnStart={true}
                          showOpacity={true}
                          showZoomTo={true}
                        />
                      </div>
                    </div>
                  </Tab>
                  <Tab disableTouchRipple={true} value={3} label="Metadata Explorer">
                    <div id="table-tab" style={{height: '100%'}}>
                      {/**<FeatureTable ref='table' map={map} layer={map.getLayers().item(1)} />**/}
                      <FeatureTableTab map={map} />
                    </div>
                  </Tab>
                </Tabs>
            </div>
            <div className="col maps">
              <MapPanel id='map' map={map} />
              <LoadingPanel map={map} />
              <div id='baselayers'><LayerList filter={filterBaseLayersIn} showGroupContent={true} map={map} /></div>
              <div id='home-button'><HomeButton tooltipPosition='right' map={map} /></div>
              <div id='zoom-buttons'><Zoom tooltipPosition='right' map={map} /></div>
              <div id='geolocation-control'><Geolocation tooltipPosition='right' map={map} /></div>
              <div id='globe-button'><Globe tooltipPosition='right' map={map} /></div>
              <div id='select-button'><Select toggleGroup='navigation' map={map}/></div>
              <div id='navigation-button'><Navigation label='blup' secondary={true} toggleGroup='navigation' map={map}/></div>
            </div>
          </div>
        </div>
      );
    }
}

MyApp.childContextTypes = {
    muiTheme: React.PropTypes.object
};

ReactDOM.render(<IntlProvider locale='en' messages={enMessages}><MyApp /></IntlProvider>, document.getElementById('main'));
