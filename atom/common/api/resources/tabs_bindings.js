var binding = require('binding').Binding.create('tabs');

var messaging = require('messaging');
var tabsNatives = requireNative('tabs');
var OpenChannelToTab = tabsNatives.OpenChannelToTab;
var process = requireNative('process');
var sendRequestIsDisabled = process.IsSendRequestDisabled();
var forEach = require('utils').forEach;
var extensionId = process.GetExtensionId();
var ipc = require('ipc_utils')

var id = 0;

var bindings = {
  connect: function(tabId, connectInfo) {
    var name = '';
    var frameId = -1;
    if (connectInfo) {
      name = connectInfo.name || name;
      frameId = connectInfo.frameId;
      if (typeof frameId == 'undefined' || frameId < 0)
        frameId = -1;
    }
    var portId = OpenChannelToTab(tabId, frameId, extensionId, name);
    return messaging.createPort(portId, name);
  },

  sendRequest: function(tabId, request, responseCallback) {
    if (sendRequestIsDisabled)
      throw new Error(sendRequestIsDisabled);
    var port = bindings.connect(tabId, {name: messaging.kRequestChannel});
    messaging.sendMessageImpl(port, request, responseCallback);
  },

  sendMessage: function(tabId, message, options, responseCallback) {
    var connectInfo = {
      name: messaging.kMessageChannel
    };
    if (options && typeof options === 'object') {
      forEach(options, function(k, v) {
        connectInfo[k] = v;
      });
    } else if (typeof options === 'function') {
      responseCallback = options;
    }

    var port = bindings.connect(tabId, connectInfo);
    messaging.sendMessageImpl(port, message, responseCallback);
  },

  onUpdated: {
    addListener: function (cb) {
      ipc.send('register-chrome-tabs-updated', extensionId);
      ipc.on('chrome-tabs-updated', function(evt, tabId, changeInfo, tab) {
        cb(tabId, changeInfo, tab);
      });
    }
  },

  onCreated: {
    addListener: function (cb) {
      ipc.send('register-chrome-tabs-created', extensionId);
      ipc.on('chrome-tabs-created', function(evt, tab) {
        cb(tab);
      });
    }
  },

  onRemoved: {
    addListener: function (cb) {
      ipc.send('register-chrome-tabs-removed', extensionId);
      ipc.on('chrome-tabs-removed', function (evt, tabId, removeInfo) {
        cb(tabId, removeInfo);
      });
    }
  },

  onActivated: {
    addListener: function (cb) {
      ipc.send('register-chrome-tabs-activated', extensionId)
      ipc.on('chrome-tabs-activated', function (evt, tabId, selectInfo) {
        cb(tabId, selectInfo)
      })
    }
  },

  onSelectionChanged: {
    addListener: function (cb) {
      ipc.send('register-chrome-tabs-activated', extensionId)
      ipc.on('chrome-tabs-activated', function (evt, tabId, selectInfo) {
        cb(tabId, selectInfo)
      })
    }
  },

  onActiveChanged: {
    addListener: function (cb) {
      ipc.send('register-chrome-tabs-activated', extensionId)
      ipc.on('chrome-tabs-activated', function (evt, tabId, selectInfo) {
        cb(tabId, selectInfo)
      })
    }
  },

  getSelected: function (windowId, cb) {
    if (typeof windowId === 'function' || windowId === null)
      bindings.query({currentWindow: true}, cb)
    else
      bindings.query({windowId: windowId}, cb)
  },

  query: function(queryInfo, cb) {
    var responseId = ++id
    ipc.once('chrome-tabs-query-response-' + responseId, function (evt, tab) {
      cb(tab)
    })
    ipc.send('chrome-tabs-query', responseId, queryInfo)
  },

  update: function (tabId, updateProperties, cb) {
    var responseId = ++id
    ipc.once('chrome-tabs-update-response-' + responseId, function (evt, tab) {
      cb && cb(tab)
    })
    ipc.send('chrome-tabs-update', responseId, tabId, updateProperties)
  },

  create: function (createProperties, cb) {
    var responseId = ++id;
    ipc.once('chrome-tabs-create-response-' + responseId, function (evt, tab) {
      cb && cb(tab)
    })
    ipc.send('chrome-tabs-create', responseId, createProperties)
  }
}

exports.binding = bindings;
