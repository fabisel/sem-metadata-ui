import AppDispatcher from 'boundless-sdk/dispatchers/AppDispatcher';
import {EventEmitter} from 'events';

// looking for state of searchText, searchText2 and value 
// add query (search texts)
// remove query

class QueryStore extends EventEmitter {
  constructor(){
    super();
    // this.activations = [];
  }

  // addActivation(activation){
  //   this.activations.push(activation);
  //   this.emitChange();
  // }

  // removeActivation(activation_id){
  //   let self = this;
  //   self.activations.forEach(function(activation, index){
  //     if (activation.activation_id === activation_id){
  //       self.activations.splice(index, 1);
  //     }
  //   });
  //   self.emitChange();
  // }

  removeQuery() {
    // ???
  }

  getActivations(){
    return this.activations;
  }

  emitChange() {
    this.emit('CHANGE');
  }

  addChangeListener(cb) {
    this.on('CHANGE', cb);
  }

  removeChangeListener(cb) {
    this.removeListener('CHANGE', cb);
  }
} 

var _activationStore = new ActivationStore();

export default _activationStore;

AppDispatcher.register(function(payload){
  let action = payload.action;
  switch (action.type) {
    case 'add-activation':
      _activationStore.addActivation(action.activation);
      break;
    case LayerConstants.REMOVE_LAYER:
      let layer = action.layer;
      if (layer.get('act_id')){
        _activationStore.removeActivation(layer.get('act_id'));
      }
      break;
    default:
      break;
  }
});