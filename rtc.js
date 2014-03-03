(function() {
  var AugumentedStatsResponse, RTC, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, attachMediaStream, createIceServer, getUserMedia, reattachMediaStream, webrtcDetectedBrowser, webrtcDetectedVersion,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  RTCPeerConnection = null;

  RTCSessionDescription = null;

  RTCIceCandidate = null;

  getUserMedia = null;

  attachMediaStream = null;

  createIceServer = null;

  reattachMediaStream = null;

  webrtcDetectedBrowser = null;

  webrtcDetectedVersion = null;

  if (navigator.mozGetUserMedia) {
    console.log("This appears to be Firefox");
    webrtcDetectedBrowser = "firefox";
    webrtcDetectedVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
    RTCPeerConnection = mozRTCPeerConnection;
    RTCSessionDescription = mozRTCSessionDescription;
    RTCIceCandidate = mozRTCIceCandidate;
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    createIceServer = function(url, username, password) {
      var iceServer, turn_url_parts, url_parts;
      iceServer = null;
      url_parts = url.split(":");
      if (url_parts[0].indexOf("stun") === 0) {
        iceServer = {
          url: url
        };
      } else if (url_parts[0].indexOf("turn") === 0) {
        if (webrtcDetectedVersion < 27) {
          turn_url_parts = url.split("?");
          if (turn_url_parts[1].indexOf("transport=udp") === 0) {
            iceServer = {
              url: turn_url_parts[0],
              credential: password,
              username: username
            };
          }
        } else {
          iceServer = {
            url: url,
            credential: password,
            username: username
          };
        }
      }
      return iceServer;
    };
    attachMediaStream = function(element, stream) {
      console.log("Attaching media stream");
      element.mozSrcObject = stream;
      return element.play();
    };
    reattachMediaStream = function(to, from) {
      console.log("Reattaching media stream");
      to.mozSrcObject = from.mozSrcObject;
      return to.play();
    };
    MediaStream.prototype.getVideoTracks = function() {
      return [];
    };
    MediaStream.prototype.getAudioTracks = function() {
      return [];
    };
  } else if (navigator.webkitGetUserMedia) {
    console.log("This appears to be Chrome");
    webrtcDetectedBrowser = "chrome";
    webrtcDetectedVersion = parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
    createIceServer = function(url, username, password) {
      var iceServer, url_parts;
      iceServer = null;
      url_parts = url.split(":");
      if (url_parts[0].indexOf("stun") === 0) {
        iceServer = {
          url: url
        };
      } else if (url_parts[0].indexOf("turn") === 0) {
        iceServer = {
          url: url,
          credential: password,
          username: username
        };
      }
      return iceServer;
    };
    RTCPeerConnection = webkitRTCPeerConnection;
    RTCSessionDescription = window.RTCSessionDescription;
    RTCIceCandidate = window.RTCIceCandidate;
    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
    attachMediaStream = function(element, stream) {
      if (typeof element.srcObject !== "undefined") {
        return element.srcObject = stream;
      } else if (typeof element.mozSrcObject !== "undefined") {
        return element.mozSrcObject = stream;
      } else if (typeof element.src !== "undefined") {
        return element.src = URL.createObjectURL(stream);
      } else {
        return console.log("Error attaching stream to element.");
      }
    };
    reattachMediaStream = function(to, from) {
      return to.src = from.src;
    };
  } else {
    console.log("Browser does not appear to be WebRTC-capable");
  }

  window.RTCAdapter = {
    RTCPeerConnection: RTCPeerConnection,
    RTCSessionDescription: RTCSessionDescription,
    RTCIceCandidate: RTCIceCandidate,
    getUserMedia: getUserMedia,
    attachMediaStream: attachMediaStream,
    createIceServer: createIceServer,
    webrtcDetectedBrowser: webrtcDetectedBrowser,
    webrtcDetectedVersion: webrtcDetectedVersion
  };

  AugumentedStatsResponse = (function() {
    function AugumentedStatsResponse(response) {
      this.response = response;
      this.get = __bind(this.get, this);
      this.result = __bind(this.result, this);
      this.collectAddressPairs = __bind(this.collectAddressPairs, this);
    }

    AugumentedStatsResponse.prototype.addressPairMap = [];

    AugumentedStatsResponse.prototype.collectAddressPairs = function(componentId) {
      var res, results, _i, _len;
      if (!this.addressPairMap[componentId]) {
        this.addressPairMap[componentId] = [];
        results = this.response.result();
        for (_i = 0, _len = results.length; _i < _len; _i++) {
          res = results[_i];
          if (res.type === 'googCandidatePair' && res.stat('googChannelId') === componentId) {
            this.addressPairMap[componentId].push(res);
          }
        }
      }
      return this.addressPairMap[componentId];
    };

    AugumentedStatsResponse.prototype.result = function() {
      return this.response.result();
    };

    AugumentedStatsResponse.prototype.get = function(key) {
      return this.response[key];
    };

    return AugumentedStatsResponse;

  })();

  RTC = (function(_super) {
    __extends(RTC, _super);

    RTC.include(Spine.Events);

    function RTC(args) {
      this.insertDTMF = __bind(this.insertDTMF, this);
      this.mediaState = __bind(this.mediaState, this);
      this.toggleMuteVideo = __bind(this.toggleMuteVideo, this);
      this.unmuteVideo = __bind(this.unmuteVideo, this);
      this.muteVideo = __bind(this.muteVideo, this);
      this.unmuteAudio = __bind(this.unmuteAudio, this);
      this.muteAudio = __bind(this.muteAudio, this);
      this.toggleMuteAudio = __bind(this.toggleMuteAudio, this);
      this.close = __bind(this.close, this);
      this.receiveAnswer = __bind(this.receiveAnswer, this);
      this.receiveOffer = __bind(this.receiveOffer, this);
      this.receive = __bind(this.receive, this);
      this.createAnswer = __bind(this.createAnswer, this);
      this.createOffer = __bind(this.createOffer, this);
      this.setLocalDescription = __bind(this.setLocalDescription, this);
      this.triggerSDP = __bind(this.triggerSDP, this);
      this.createStream = __bind(this.createStream, this);
      this.createPeerConnection = __bind(this.createPeerConnection, this);
      this.addIceServer = __bind(this.addIceServer, this);
      this.getStats = __bind(this.getStats, this);
      this.start = __bind(this.start, this);
      var key, value;
      console.log("[INFO] RTC constructor");
      for (key in args) {
        value = args[key];
        this[key] = value;
      }
      if (this.mediaConstraints == null) {
        this.mediaConstraints = {
          audio: true,
          video: true
        };
      }
      this.isVideoActive = true;
      this.isAudioActive = true;
      this.iceServers = [];
    }

    RTC.prototype.pcOptions = {
      optional: [
        {
          DtlsSrtpKeyAgreement: true
        }, {
          RtpDataChannels: true
        }
      ]
    };

    RTC.prototype.start = function() {
      console.log("PeerConnection starting");
      this.noMoreCandidates = navigator.mozGetUserMedia != null;
      this.dtmfSender = null;
      return this.createPeerConnection();
    };

    RTC.prototype.dumpStats = function(obj) {
      var dict, names, properties, values;
      dict = {};
      dict = _.pick(obj, "timestamp", "id", "type");
      properties = {};
      if (obj.names) {
        names = obj.names();
        values = _.map(names, function(x) {
          return obj.stat(x);
        });
        properties = _.object(names, values);
      } else if (obj.stat("audioOutputLevel")) {
        properties = {
          audioOutputLevel: obj.stat("audioOutputLevel")
        };
      }
      return _.extend(dict, properties);
    };

    RTC.prototype.getStats = function(cb) {
      if (!((this.pc != null) && (this.remotestream != null) && (cb != null))) {
        return;
      }
      return this.pc.getStats((function(_this) {
        return function(rawStats) {
          var results, stats;
          stats = new AugumentedStatsResponse(rawStats);
          results = stats.result();
          return cb(_.compact(_.map(results, function(result) {
            var local, remote, report;
            report = null;
            if (!result.local || result.local === result) {
              report = _this.dumpStats(result);
              if (result.local && result.local !== result) {
                local = {
                  local: _this.dumpStats(result.local)
                };
              }
              if (result.remote && result.remote !== result) {
                remote = {
                  remote: _this.dumpStats(result.remote)
                };
              }
              return _.extend(report, local || {}, remote || {});
            }
            return null;
          })));
        };
      })(this));
    };

    RTC.prototype.addIceServer = function(url, username, password) {
      return this.iceServers.push(RTCAdapter.createIceServer(url, username, password));
    };

    RTC.prototype.createPeerConnection = function() {
      var iceGatheringEndCb;
      console.log("[INFO] createPeerConnection");
      console.log("[MEDIA] ICE servers");
      console.log(this.iceServers);
      this.pc = new RTCAdapter.RTCPeerConnection({
        "iceServers": this.iceServers
      }, this.pcOptions);
      this.pc.onaddstream = (function(_this) {
        return function(event) {
          console.log("[MEDIA] Stream added");
          _this.remotestream = event.stream;
          if (RTCAdapter.webrtcDetectedBrowser === "chrome") {
            _this.dtmfSender = _this.pc.createDTMFSender(_this.localstream.getAudioTracks()[0]);
            _this.dtmfSender.ontonechange = function(dtmf) {
              console.log(dtmf);
              return console.log("[INFO] DTMF send - " + dtmf.tone);
            };
            window.test = _this.insertDTMF;
          }
          _this.trigger("remotestream", _this.remotestream);
          return _this.getStats(function(x) {
            return console.log(x);
          });
        };
      })(this);
      iceGatheringEndCb = (function(_this) {
        return function() {
          console.log("[INFO] No more ice candidates");
          _this.noMoreCandidates = true;
          if (_this.pc.localDescription != null) {
            return _this.triggerSDP();
          }
        };
      })(this);
      this.pc.onicecandidate = (function(_this) {
        return function(evt) {
          var candidate;
          console.log("[INFO] onicecandidate");
          if (evt.candidate) {
            console.log("[INFO] New ICE candidate:");
            console.log("" + evt.candidate.candidate);
            return candidate = {
              type: 'candidate',
              label: evt.candidate.sdpMLineIndex,
              id: evt.candidate.sdpMid,
              candidate: evt.candidate.candidate
            };
          } else {
            return iceGatheringEndCb();
          }
        };
      })(this);
      this.pc.oniceconnectionstatechange = (function(_this) {
        return function(evt) {
          if (evt.currentTarget.iceGatheringState === 'complete' && _this.pc.iceConnectionState !== 'closed') {
            console.log("[INFO] iceGatheringState -> " + evt.currentTarget.iceGatheringState);
            return iceGatheringEndCb();
          }
        };
      })(this);
      this.pc.onicechange = (function(_this) {
        return function() {
          return console.log("[INFO] icestate changed -> " + _this.pc.iceState);
        };
      })(this);
      this.pc.onstatechange = (function(_this) {
        return function() {
          return console.log("[INFO] peerconnectionstate changed -> " + _this.pc.readyState);
        };
      })(this);
      this.pc.onopen = function() {
        return console.log("[MEDIA] peerconnection opened");
      };
      this.pc.onclose = function() {
        return console.log("[INFO] peerconnection closed");
      };
      return this.createStream();
    };

    RTC.prototype.createStream = function() {
      var gumFail, gumSuccess;
      console.log("[INFO] createStream");
      if (this.localstream != null) {
        console.log("[INFO] Using media previously got.");
        return this.pc.addStream(this.localstream);
      } else {
        gumSuccess = (function(_this) {
          return function(localstream) {
            var _ref;
            _this.localstream = localstream;
            console.log("[INFO] getUserMedia successed");
            _this.pc.addStream(_this.localstream);
            _this.trigger("localstream", _this.localstream);
            console.log("localstream", _this.localstream);
            return _ref = [_this.localstream.getVideoTracks().length > 0, _this.localstream.getAudioTracks().length > 0], _this.isVideoActive = _ref[0], _this.isAudioActive = _ref[1], _ref;
          };
        })(this);
        gumFail = (function(_this) {
          return function(error) {
            console.error(error);
            console.error("GetUserMedia error");
            return _this.trigger("error", "getUserMedia");
          };
        })(this);
        return RTCAdapter.getUserMedia(this.mediaConstraints, gumSuccess, gumFail);
      }
    };

    RTC.prototype.triggerSDP = function() {
      var sdp;
      console.log("[MEDIA]");
      sdp = this.pc.localDescription.sdp;
      return this.trigger("sdp", sdp);
    };

    RTC.prototype.setLocalDescription = function(sessionDescription, callback) {
      var fail, success;
      success = (function(_this) {
        return function() {
          console.log("[INFO] setLocalDescription successed");
          if (_this.noMoreCandidates) {
            return _this.triggerSDP();
          }
        };
      })(this);
      fail = (function(_this) {
        return function() {
          return _this.trigger("error", "setLocalDescription", sessionDescription);
        };
      })(this);
      return this.pc.setLocalDescription(sessionDescription, success, fail);
    };

    RTC.prototype.createOffer = function() {
      var error;
      console.log("[INFO] createOffer");
      error = (function(_this) {
        return function(e) {
          return _this.trigger("error", "createOffer", e);
        };
      })(this);
      return this.pc.createOffer(this.setLocalDescription, error, {});
    };

    RTC.prototype.createAnswer = function() {
      var error;
      console.log("[INFO] createAnswer");
      error = (function(_this) {
        return function(e) {
          return _this.trigger("error", "createAnswer", e);
        };
      })(this);
      return this.pc.createAnswer(this.setLocalDescription, error, {});
    };

    RTC.prototype.receive = function(sdp, type, callback) {
      var description, success;
      success = (function(_this) {
        return function() {
          console.log("[INFO] Remote description setted.");
          console.log("[INFO] localDescription:");
          console.log(_this.pc.localDescription);
          console.log("[INFO] remotelocalDescription:");
          console.log(_this.pc.remoteDescription);
          return typeof callback === "function" ? callback() : void 0;
        };
      })(this);
      description = new RTCAdapter.RTCSessionDescription({
        type: type,
        sdp: sdp
      });
      return this.pc.setRemoteDescription(description, success, (function(_this) {
        return function() {
          return _this.trigger("error", "setRemoteDescription", description);
        };
      })(this));
    };

    RTC.prototype.receiveOffer = function(sdp, callback) {
      if (callback == null) {
        callback = null;
      }
      console.log("[INFO] Received offer");
      return this.receive(sdp, "offer", callback);
    };

    RTC.prototype.receiveAnswer = function(sdp) {
      console.log("[INFO] Received answer");
      return this.receive(sdp, "answer");
    };

    RTC.prototype.close = function() {
      var e;
      try {
        return this.pc.close();
      } catch (_error) {
        e = _error;
        console.error("[ERROR] Error closing peerconnection");
        return console.error(e);
      } finally {
        this.pc = null;
        this.start();
      }
    };

    RTC.prototype.toggleMuteAudio = function() {
      var audioTracks;
      audioTracks = this.localstream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.log("[MEDIA] No local audio available.");
        return;
      }
      if (this.isAudioActive) {
        return this.muteAudio();
      } else {
        return this.unmuteAudio();
      }
    };

    RTC.prototype.muteAudio = function() {
      var audioTrack, audioTracks, _i, _len;
      audioTracks = this.localstream.getAudioTracks();
      for (_i = 0, _len = audioTracks.length; _i < _len; _i++) {
        audioTrack = audioTracks[_i];
        audioTrack.enabled = false;
      }
      return this.isAudioActive = false;
    };

    RTC.prototype.unmuteAudio = function() {
      var audioTrack, audioTracks, _i, _len;
      audioTracks = this.localstream.getAudioTracks();
      for (_i = 0, _len = audioTracks.length; _i < _len; _i++) {
        audioTrack = audioTracks[_i];
        audioTrack.enabled = true;
      }
      return this.isAudioActive = true;
    };

    RTC.prototype.muteVideo = function() {
      var videoTrack, videoTracks, _i, _len;
      videoTracks = this.localstream.getVideoTracks();
      for (_i = 0, _len = videoTracks.length; _i < _len; _i++) {
        videoTrack = videoTracks[_i];
        videoTrack.enabled = false;
      }
      return this.isVideoActive = false;
    };

    RTC.prototype.unmuteVideo = function() {
      var videoTrack, videoTracks, _i, _len;
      videoTracks = this.localstream.getVideoTracks();
      for (_i = 0, _len = videoTracks.length; _i < _len; _i++) {
        videoTrack = videoTracks[_i];
        videoTrack.enabled = true;
      }
      return this.isVideoActive = true;
    };

    RTC.prototype.toggleMuteVideo = function() {
      var videoTracks;
      videoTracks = this.localstream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.log("[MEDIA] No local audio available.");
        return;
      }
      if (this.isVideoActive) {
        return this.muteVideo();
      } else {
        return this.unmuteVideo();
      }
    };

    RTC.prototype.mediaState = function() {
      return {
        video: Boolean(this.isVideoActive),
        audio: Boolean(this.isAudioActive)
      };
    };

    RTC.prototype.insertDTMF = function(tone) {
      if (this.dtmfSender != null) {
        return this.dtmfSender.insertDTMF(tone, 500, 50);
      }
    };

    RTC.prototype.attachStream = function($d, stream) {
      return RTCAdapter.attachMediaStream($d[0], stream);
    };

    return RTC;

  })(Spine.Module);

  window.RTC = RTC;

}).call(this);
