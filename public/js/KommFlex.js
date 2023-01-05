
var selfEasyrtcid = "";
var customerEasyrtcid = [];
//var sound_ring = new Audio('/public/sound/ring.mp3');
//sound_ring.loop = true;
var ws = new WebSocket("ws://localhost:8225");
var cameraList = [];

ws.onopen = function () {
    ws.send(
        JSON.stringify({
            msg: "OpenedWebSocketVideoChannel",
            data: "",
        })
    );

    connect();
};

ws.onmessage = function (evt) {
    var received_msg = evt.data;
    var json_msg_obj = JSON.parse(received_msg)

    console.log(received_msg);
    
    if(json_msg_obj.msg == "Ring"){
        ring(json_msg_obj.data);
    }else if(json_msg_obj.msg == "SendTextMessage"){
        var json_data_obj = JSON.parse(json_msg_obj.data)
        sendTextMessage(json_data_obj.rtcid, json_data_obj.text);
    }else if(json_msg_obj.msg == "RejectCall"){
        document.getElementById("callRejectButton").click();
    }else if(json_msg_obj.msg == "HangUp"){
        easyrtc.hangupAll();
        setFreeState();
    }else if(json_msg_obj.msg == "AcceptCall"){
        document.getElementById("callAcceptButton").click();
    }
};

ws.onclose = function () {
    // websocket is closed.
    //alert("Connection is closed...");
};

function hideElement(domId) {
    document.getElementById(domId).style.visibility = 'hidden';
}

function showElement(domId) {
    document.getElementById(domId).style.visibility = 'visible';
}

function setFreeState(){
    console.log("Happy : Free state.");

    document.getElementById("selfVideo").classList.remove("subVideo");
    document.getElementById("selfVideo").classList.add("mainVideo");

    //showElement('ringButton');
    hideElement('hangupButton');    
    hideElement('acceptCallBox');

//    sound_ring.pause();
//    sound_ring.currentTime = 0;

    easyrtc.hangupAll();
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
    easyrtc.setVideoObjectSrc(document.getElementById('selfVideo'), "");
    easyrtc.closeLocalMediaStream();
}

function setRingingState(){
    console.log("Happy : Ringing state.");

    //hideElement('ringButton');
    showElement('hangupButton');    
    hideElement('acceptCallBox');

//    sound_ring.play();
}

function setIncommingState(easyrtcid){
    console.log("Happy : Incomming state.");

    //hideElement('ringButton');
    hideElement('hangupButton');    
    showElement('acceptCallBox');

    //sound_ring.play();

    ws.send(
        JSON.stringify({
            msg: "InCommingCall",
            data: easyrtcid
        })
    );
}

function setCallingState(){
    console.log("Happy : Callling state.");

    document.getElementById("selfVideo").classList.remove("mainVideo");
    document.getElementById("selfVideo").classList.add("subVideo");

    //hideElement('ringButton');
    showElement('hangupButton');    
    hideElement('acceptCallBox');

//    sound_ring.pause();
//    sound_ring.currentTime = 0;
}

function receivedTextMessage(who, msgType, content) {
    console.log("ReceivedTextMessage => " + who + " : " + content);

    ws.send(
        JSON.stringify({
            msg: "ReceivedTextMessage",
            data: JSON.stringify({
                rtcid: who,
                text: content,
            }),
        })
    );
}

function sendTextMessage(easyrtcid, str){    
    console.log("SendTextMessage => " + easyrtcid + " : " + str);

    easyrtc.sendDataWS(easyrtcid, "message",  str);
}

function connect() {
    easyrtc.enableDebug(true);
    
    console.log("Happy : Connecting to server.");

    easyrtc.setPeerListener(receivedTextMessage);
    easyrtc.setRoomOccupantListener(convertListToButtons);    
    easyrtc.connect("KommFlexRoom", loginSuccess, loginFailure);
}

function clearConnectList() {
    while(customerEasyrtcid.length > 0) {
        customerEasyrtcid.pop();
    }

    ws.send(
        JSON.stringify({
            msg: "ConnectedRTCIds",
            data: JSON.stringify(customerEasyrtcid),
        })
    );
}

function convertListToButtons (roomName, occupants, isPrimary) {
    clearConnectList();
    console.log("+++++++++++++++++++");

    for(var easyrtcid in occupants) {
        customerEasyrtcid.push(easyrtcid);

        sendTextMessage(easyrtcid, "Welcome to KommFlex!");
    } 

    ws.send(
        JSON.stringify({
            msg: "ConnectedRTCIds",
            data: JSON.stringify(customerEasyrtcid),
        })
    );
}

function ring(data){
    var json_data_obj = JSON.parse(data)
    var contact_id = json_data_obj.rtcid;
    var cam_num = parseInt(json_data_obj.camnum, 0);

    if(contact_id.length == 0){
        setFreeState();
        return;
    }

    if(cam_num < 0 || cam_num >= cameraList.length){
        setFreeState();
        return;
    }

    if(easyrtc.getConnectionCount() > 0){
        //setFreeState();
        return;
    }

    easyrtc.setVideoSource(cameraList[cam_num]);

    easyrtc.initMediaSource(
        function(){        
            // success callback
            var selfVideo = document.getElementById("selfVideo");
            easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());          

            if(customerEasyrtcid.length > 0){
                // var easyrtcid = customerEasyrtcid[0];
                performCall(contact_id);
            }else{
                setFreeState();
            }
        },
        function(errorCode, errmesg){
            // easyrtc.showError("MEDIA-ERROR", errmesg);
			ws.send(
				JSON.stringify({
					msg: "ERROR",
					data: "",
				})
			);
			setFreeState();
        }   // failure callback		
    );    
}

easyrtc.setOnError( function(errorObject){
    setFreeState();    

    ws.send(
        JSON.stringify({
            msg: "ERROR",
            data: "",
        })
    );
});

function performCall(otherEasyrtcid) {
    easyrtc.hangupAll();
    var acceptedCB = function(accepted, easyrtcid) {
        if( !accepted ) {
            //easyrtc.showError("CALL-REJECTED", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
            setFreeState();

            ws.send(
                JSON.stringify({
                    msg: "CallRejected",
                    data: "",
                })
            );
        }
    };
    var successCB = function() {        
        setCallingState();

        ws.send(
            JSON.stringify({
                msg: "CallSuccess",
                data: "",
            })
        );
    };
    var failureCB = function() {

        ws.send(
            JSON.stringify({
                msg: "CallFailure",
                data: "",
            })
        );

        setFreeState();
        //disconnect();
    };
    easyrtc.call(otherEasyrtcid, successCB, failureCB, acceptedCB);

    setRingingState();
}

function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;

    ws.send(
        JSON.stringify({
            msg: "LoggedInRoom",
            data: selfEasyrtcid,
        })
    );
}

function loginFailure(errorCode, message) {
    // easyrtc.showError(errorCode, message);

    ws.send(
        JSON.stringify({
            msg: "LoginFailure",
            data: "",
        })
    );
}

function terminatePage() {
    // console.log("Happy : Terminate page.");
    easyrtc.disconnect();
    setFreeState();
}

function disconnect() {
    easyrtc.disconnect();
    setFreeState();
}

easyrtc.setStreamAcceptor( function(easyrtcid, stream) {
    var video = document.getElementById('callerVideo');
    easyrtc.setVideoObjectSrc(video,stream);
   
    setCallingState();

    ws.send(
        JSON.stringify({
            msg: "StreamAccepted",
            data: easyrtcid,
        })
    );
});

easyrtc.setOnStreamClosed( function (easyrtcid) {
    easyrtc.setVideoObjectSrc(document.getElementById('callerVideo'), "");
    setFreeState();

    ws.send(
        JSON.stringify({
            msg: "StreamClosed",
            data: easyrtcid,
        })
    );
});

easyrtc.setAcceptChecker(function(easyrtcid, callback) {
	if(easyrtc.getConnectionCount() > 0){
		ws.send(
			JSON.stringify({
				msg: "InCommingCall",
				data: easyrtcid
			})
		);
    }else{
		setIncommingState(easyrtcid);
	}

    var acceptTheCall = function(wasAccepted) {
        if( wasAccepted && easyrtc.getConnectionCount() > 0 ) {
            easyrtc.hangupAll();
        }
        callback(wasAccepted); 
        
        if(wasAccepted){
            easyrtc.initMediaSource(
                function(){
                    // success callback
                    var selfVideo = document.getElementById("selfVideo");
                    easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
                },
                function(errorCode, errmesg){
                    // easyrtc.showError("MEDIA-ERROR", errmesg);
                }   // failure callback
            );
        }else{
            ws.send(
                JSON.stringify({
                    msg: "CallRejected",
                    data: easyrtcid
                })
            );
        }
    };

    document.getElementById("callAcceptButton").onclick = function() {
        acceptTheCall(true);
        setCallingState();
    };

    document.getElementById("callRejectButton").onclick =function() {
        acceptTheCall(false);
        setFreeState();
    };
});

easyrtc.setCallCancelled( function(easyrtcid, explicitlyCancelled){
    setFreeState();

    ws.send(
        JSON.stringify({
            msg: "CallCancelled",
            data: easyrtcid,
        })
    );
 });

easyrtc.getVideoSourceList( function(list) {
    while(cameraList.length > 0) {
        cameraList.pop();
    }
 
    for(var i = 0 ; i <list.length; i++) {
        //easyrtc.setVideoSource(list[1].id);        
        cameraList.push(list[i].id);
    }
});

window.onload = function(){
   setFreeState();
}

