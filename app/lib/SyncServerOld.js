// Generated by CoffeeScript 1.6.3
(function() {
  var BTSYNC_HEADER, SyncServer, bencoding, dgram, errors, packets,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  dgram = require('dgram');

  bencoding = require('bencoding');

  errors = require('./errors');

  packets = require('./packets');

  BTSYNC_HEADER = new Buffer([66, 83, 89, 78, 67, 0]);

  module.exports = SyncServer = (function() {
    function SyncServer(config, log) {
      this.config = config;
      this.log = log;
      this.onMessage = __bind(this.onMessage, this);
      this.onError = __bind(this.onError, this);
      this.deleteDeadShares = __bind(this.deleteDeadShares, this);
      this.deleteDeadPeers = __bind(this.deleteDeadPeers, this);
      this.socket = dgram.createSocket('udp4');
      this.socket.on('error', this.onError);
      this.socket.on('message', this.onMessage);
      this.trackerData = {};
      setInterval(this.deleteDeadPeers, 10000);
    }

    SyncServer.prototype.deleteDeadPeers = function() {
      var key, now, peer, share, _, _ref, _ref1, _ref2;
      now = new Date();
      _ref = this.trackerData;
      for (_ in _ref) {
        share = _ref[_];
        _ref1 = share.peers;
        for (key in _ref1) {
          peer = _ref1[key];
          if (Math.round((now - peer.updatedAt) / 1000) > ((_ref2 = this.config.peerTimeout) != null ? _ref2 : 60)) {
            this.log.debug('Deleted dead peer: ' + key);
            delete share.peers[key];
          }
        }
      }
      return this.deleteDeadShares();
    };

    SyncServer.prototype.deleteDeadShares = function() {
      var key, now, share, _ref, _results;
      now = new Date();
      _ref = this.trackerData;
      _results = [];
      for (key in _ref) {
        share = _ref[key];
        if (Object.keys(share.peers).length <= 0) {
          this.log.log('Deleted dead share: ' + key);
          _results.push(delete this.trackerData[key]);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    SyncServer.prototype.onError = function(err) {
      return this.log.error(err);
    };

    SyncServer.prototype.onMessage = function(packet, rpeer) {
      var err, packetData, packetHeader, packetPayload;
      packetHeader = packet.slice(0, BTSYNC_HEADER.length);
      packetPayload = packet.slice(packetHeader.length);
      if (!packetHeader.toString('hex') === BTSYNC_HEADER.toString('hex')) {
        this.log.warning('Destroyed received package with invalid header.');
        return;
      }
      try {
        packetData = bencoding.decode(packetPayload).toJSON();
      } catch (_error) {
        err = _error;
        this.log.warning('Destroyed received package with invalid payload.');
        return;
      }
      return this.handlePacket(packetData, rpeer);
    };

    SyncServer.prototype.handlePacket = function(packet, rpeer) {
      var packetType;
      if (packet.m == null) {
        this.log.warning('Destroyed received package with invalid payload.');
        return;
      }
      packetType = packet.m.toString();
      switch (packetType) {
        case 'get_peers':
          return packets.get_peers(this, rpeer, packet);
        default:
          return this.log.warning('Unknown packet type received: ' + packetType);
      }
    };

    SyncServer.prototype.send = function(answer, peer) {
      var packet, packetPayload;
      packetPayload = bencoding.encode(answer);
      packet = new Buffer(packetPayload.length + BTSYNC_HEADER.length);
      BTSYNC_HEADER.copy(packet);
      packetPayload.copy(packet, BTSYNC_HEADER.length);
      return this.socket.send(packet, 0, packet.length, peer.port, peer.address);
    };

    SyncServer.prototype.listen = function(port, address) {
      this.socket.bind(port, address);
      return this.log.info('sync.io tracker and relay server listening on ' + address + ':' + port);
    };

    return SyncServer;

  })();

}).call(this);
