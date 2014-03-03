##
# Copyright (C) Quobis
# Project site: https://github.com/Quobis/QoffeeSIP
#
# Licensed under GNU-LGPL-3.0-or-later (http://www.gnu.org/licenses/lgpl-3.0.html)
##

# https://webrtc.googlecode.com/svn/trunk/samples/js/demos/html/constraints-and-stats.html


class AugumentedStatsResponse

	constructor: (@response) ->

	addressPairMap: []

	collectAddressPairs: (componentId) =>
		if (!@addressPairMap[componentId])
			@addressPairMap[componentId] = []
			results = @response.result()
			for res in results
				if res.type is 'googCandidatePair' and res.stat('googChannelId') is componentId
					@addressPairMap[componentId].push res
		return @addressPairMap[componentId]

	result: => @response.result()

	get: (key) => @response[key]


# In this class we use WebRTC API described here: http://dev.w3.org/2011/webrtc/editor/webrtc.html
class RTC extends Spine.Module
	@include Spine.Events
	constructor: (args) ->
		console.log "[INFO] RTC constructor"
		@[key] = value for key,value of args

		@mediaConstraints ?= {audio: true, video: true}
		@isVideoActive     = true
		@isAudioActive     = true
		@iceServers        = []

	pcOptions: {optional: [ {DtlsSrtpKeyAgreement: true}, {RtpDataChannels: true}]}

	start: () =>
		console.log "PeerConnection starting"
		# Firefox does not provide *onicecandidate* callback.
		@noMoreCandidates = navigator.mozGetUserMedia?
		@dtmfSender       = null
		@createPeerConnection()

	# Dumping a stats variable as a string.
	# might be named toString?

	dumpStats: (obj) ->
		dict = {}
		dict = _.pick obj, "timestamp", "id", "type"
		properties = {}
		if obj.names
			names   = obj.names()
			values = _.map names, (x) -> obj.stat x
			properties = _.object names, values
		else if obj.stat "audioOutputLevel"
			properties = {audioOutputLevel: obj.stat "audioOutputLevel"}

		return _.extend dict, properties


	# extractVideoFlowInfo: (res, allStats) ->
	# 	description = {}
	# 	bytesNow    = res.stat "bytesReceived"
	# 	if timestampPrev > 0
	# 		bitRate     = Math.round((bytesNow - bytesPrev) * 8 / (res.timestamp - timestampPrev))
	# 		description = {bitRate}
	# 	timestampPrev = res.timestamp
	# 	bytesPrev     = bytesNow
	# 	if res.stat "transportId"
	# 		component = allStats.get res.stat "transportId"
	# 		if component
	# 			addresses = allStats.collectAddressPairs(component.id)
	# 			if addresses.length > 0
	# 				description.IP = addresses[0].stat "googRemoteAddress"
	# 	return description

	getStats: (cb) =>
		return unless @pc? and @remotestream? and cb?
		@pc.getStats (rawStats) =>
			stats       = new AugumentedStatsResponse rawStats
			results     = stats.result()

			cb _.compact _.map results, (result) =>
				report = null
				if !result.local or result.local is result
					report = @dumpStats result
					# The bandwidth info for video is in a type ssrc stats record
					# with googFrameHeightReceived defined.
					# Should check for mediatype = video, but this is not
					# implemented yet.
					# if result.type is 'ssrc' and result.stat('googFrameHeightReceived')
					# 	# This is the video flow.
					# 	return @extractVideoFlowInfo result, stats
					# else
					# Pre-227.0.1445 (188719) browser
					if result.local and result.local isnt result
						local = local: @dumpStats result.local

					if result.remote and result.remote isnt result
						remote = remote: @dumpStats result.remote
					return _.extend report, local or {}, remote or {}
				return null

	# Adds a new ICE (TURN or STUN) server.
	addIceServer: (url, username, password) =>
		@iceServers.push RTCAdapter.createIceServer url, username, password

	createPeerConnection: =>
		console.log "[INFO] createPeerConnection"
		# We must provide at least one stun/turn server as parameter.
		# If the server is not reacheable by browser, peerconnection can only get host candidates.
		console.log "[MEDIA] ICE servers"
		console.log @iceServers
		@pc = new RTCAdapter.RTCPeerConnection "iceServers": @iceServers, @pcOptions

		# When we receive remote media (RTP from the other peer), attach it to the DOM element.
		@pc.onaddstream = (event) =>
			console.log "[MEDIA] Stream added"
			@remotestream = event.stream

			# DTMFs onoly works on Chrome
			if RTCAdapter.webrtcDetectedBrowser is "chrome"
				@dtmfSender   = @pc.createDTMFSender(@localstream.getAudioTracks()[0])
				@dtmfSender.ontonechange = (dtmf) ->
					console.log dtmf
					console.log "[INFO] DTMF send - #{dtmf.tone}"
				window.test = @insertDTMF

			@trigger "remotestream", @remotestream
			# @getStats (x) -> console.log x

		# When a new ice candidate is received and it's not null, we'll show it in the console.
		# If we receive a null candidate, if means the candidate gathering process is finished;
		# so we just have to wait for the SDP to be avaliable. If it's already avaliable, we
		# trigger the SDP event.

		iceGatheringEndCb = =>
			console.log "[INFO] No more ice candidates"
			@noMoreCandidates = true
			# If we don't expect more ice candidates and the local description is
			# set, send the sdp (fire the "sdp" event).
			@triggerSDP() if @pc.localDescription?

		@pc.onicecandidate = (evt) =>
			console.log "[INFO] onicecandidate"
			if evt.candidate
				console.log "[INFO] New ICE candidate:"
				console.log "#{evt.candidate.candidate}"
				candidate =
					type      : 'candidate'
					label     : evt.candidate.sdpMLineIndex
					id        : evt.candidate.sdpMid
					candidate : evt.candidate.candidate

			else
				do iceGatheringEndCb

		@pc.oniceconnectionstatechange = (evt) =>
			if evt.currentTarget.iceGatheringState is 'complete' and @pc.iceConnectionState isnt 'closed'
				console.log "[INFO] iceGatheringState -> #{evt.currentTarget.iceGatheringState}"
				do iceGatheringEndCb

		# PeerConnections events just to log them (only chrome).
		@pc.onicechange   = => console.log "[INFO] icestate changed -> #{@pc.iceState}"
		@pc.onstatechange = => console.log "[INFO] peerconnectionstate changed -> #{@pc.readyState}"
		@pc.onopen        = -> console.log "[MEDIA] peerconnection opened"
		@pc.onclose       = -> console.log "[INFO] peerconnection closed"
		@createStream()

	# This function creates or gets previous media, add it to
	# the PeerConnection and attaches it to the DOM.
	createStream: () =>
		console.log "[INFO] createStream"
		# Localstream already exists, so we just add it to current PeerConnection object.
		if @localstream?
			console.log "[INFO] Using media previously got."
			@pc.addStream @localstream
		# If there is not previous localstream, get it, add it to current PeerConnection object.
		else
			gumSuccess = (@localstream) =>
				console.log "[INFO] getUserMedia successed"
				@pc.addStream @localstream
				# We trigger an event to be able to bind any behaviour when we get media; for example,
				# to show a popup telling "Media got".
				@trigger "localstream"    , @localstream
				console.log "localstream" , @localstream
				[@isVideoActive, @isAudioActive] = [@localstream.getVideoTracks().length > 0, @localstream.getAudioTracks().length > 0]
			gumFail = (error) =>
				console.error error
				console.error "GetUserMedia error"
				@trigger "error", "getUserMedia"
			# Ask to access hardware.
			# gumSuccess and gumFail are callbacks that will be executed under getUserMedia success and failure executions.
			RTCAdapter.getUserMedia @mediaConstraints, gumSuccess, gumFail

	# Gets localDescription and trigger it in the "sdp" event.
	triggerSDP: () =>
		console.log "[MEDIA]"
		sdp = @pc.localDescription.sdp
		@trigger "sdp", sdp

	# Set local description and trigger "sdp" event if
	setLocalDescription: (sessionDescription, callback) =>
		success = =>
			console.log "[INFO] setLocalDescription successed"
			# If we have all ice candidates and local description set, sdp is ready.
			@triggerSDP() if @noMoreCandidates

		fail = => @trigger "error", "setLocalDescription", sessionDescription
		# success and fail are callbacks that will be called on success or fail cases.
		@pc.setLocalDescription sessionDescription, success, fail

	# Creates the sdp and set as localDescription.
	# This function will be called when we are the caller.
	createOffer: () =>
		console.log "[INFO] createOffer"
		error = (e) => @trigger "error", "createOffer", e
		@pc.createOffer @setLocalDescription, error, {}

	# Creates the sdp and set as localDescription.
	# This function will be called when we are the callee.
	# This function will fail if there is not remoteDescription.
	createAnswer: () =>
		console.log "[INFO] createAnswer"
		error = (e) =>  @trigger "error", "createAnswer", e
		@pc.createAnswer @setLocalDescription, error, {}

	# Generic function to receive both, SDP offer and answer.
	# It will be called from *receiveOffer* and *receiveAnswer*.
	receive: (sdp, type, callback) =>
		success = =>
			console.log "[INFO] Remote description setted."
			console.log "[INFO] localDescription:"
			console.log @pc.localDescription
			console.log "[INFO] remotelocalDescription:"
			console.log @pc.remoteDescription
			callback?()

		description = new RTCAdapter.RTCSessionDescription type: type, sdp: sdp
		@pc.setRemoteDescription description, success, => @trigger "error", "setRemoteDescription", description

	# Receive SDP offer.
	# Set remoteDescription.
	receiveOffer: (sdp, callback = null) =>
		console.log "[INFO] Received offer"
		@receive sdp, "offer", callback

	# Receive SDP answer.
	# Set remoteDescription.
	receiveAnswer: (sdp) =>
		console.log "[INFO] Received answer"
		@receive sdp, "answer"

	# Close PeerConnection and reset it with *start*.
	close: () =>
		# Hide remote video.
		# Closing PeerConnection fails if the PeerConnection is not opened.
		try
			@pc.close()
		catch e
			console.error "[ERROR] Error closing peerconnection"
			console.error e
		finally
			@pc         = null
			@start()

	toggleMuteAudio: () =>
		# Call the getAudioTracks method via "adapter.js".
		audioTracks = @localstream.getAudioTracks()

		if audioTracks.length is 0
			console.log "[MEDIA] No local audio available."
			return

		if @isAudioActive
			@muteAudio()
		else
			@unmuteAudio()

	muteAudio: () =>
		audioTracks        = @localstream.getAudioTracks()
		audioTrack.enabled = false for audioTrack in audioTracks
		@isAudioActive     = false

	unmuteAudio: () =>
		audioTracks        = @localstream.getAudioTracks()
		audioTrack.enabled = true for audioTrack in audioTracks
		@isAudioActive     = true

	muteVideo: () =>
		videoTracks        = @localstream.getVideoTracks()
		videoTrack.enabled = false for videoTrack in videoTracks
		@isVideoActive     = false

	unmuteVideo: () =>
		videoTracks        = @localstream.getVideoTracks()
		videoTrack.enabled = true for videoTrack in videoTracks
		@isVideoActive     = true

	toggleMuteVideo: () =>
		videoTracks = @localstream.getVideoTracks()

		if videoTracks.length is 0
			console.log "[MEDIA] No local audio available."
			return

		if @isVideoActive
			@muteVideo()
		else
			@unmuteVideo()

	mediaState: () =>
		video: Boolean(@isVideoActive), audio: Boolean(@isAudioActive)

	insertDTMF: (tone) =>
		@dtmfSender.insertDTMF tone, 500, 50 if @dtmfSender?

	attachStream: ($d, stream) ->
		RTCAdapter.attachMediaStream $d[0], stream

window.RTC = RTC