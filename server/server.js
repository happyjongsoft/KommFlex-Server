// Load required modules
var http    = require("http");              // http server core module
var express = require("express");           // web framework external module
var serveStatic = require('serve-static');  // serve static files
var socketIo = require("socket.io");        // web socket external module
var sql = require("mssql");
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');

// This sample is using the easyrtc from parent folder.
// To use this server_example folder only without parent folder:
// 1. you need to replace this "require("../");" by "require("easyrtc");"
// 2. install easyrtc (npm i easyrtc --save) in server_example/package.json

var easyrtc = require("../"); // EasyRTC internal module

// Set process name
process.title = "node-easyrtc";

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var app = express();
app.use(serveStatic('static', {'index': ['index.html']}), express.urlencoded(), express.static(path.join(__dirname, 'uploads')));
app.use(express.json());


var config = {
	"user": "sa", 
	"password": "Video2019",
	"server": "DEVSERVER\\SQLEXPRESS", 
	"database": "happyvideocom", 
	"options": {
		"encrypt": true
	},
	"port":1433
}

sql.connect(config);

// Start Express http server on port 8080
var webServer = http.createServer(app);

// Start Socket.io so it attaches itself to Express server
var socketServer = socketIo.listen(webServer, {"log level":1});

easyrtc.setOption("logLevel", "debug");

// Overriding the default easyrtcAuth listener, only so we can directly access its callback
easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
    easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
        if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
            callback(err, connectionObj);
            return;
        }

        connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

        console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

        callback(err, connectionObj);
    });
});

// To test, lets print the credential to the console for every room join!
easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
    console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
    easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
});

// Start EasyRTC server
var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
    console.log("Initiated");

    rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
        console.log("roomCreate fired! Trying to create: " + roomName);

        appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
    });
});



app.post('/', function (req, res) { 
	try{
		// create Request object
		var request = new sql.Request();

		// query to the database and get the data
		request.query("select * from Endpoints", function (err, recordset) {

			if (err){
				console.log(err);
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
					})
				);
				
				return;
			}
			
			// send data as a response
			res.send(recordset);

		});
	}catch(Exception){
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1002,
				data: "",
			})
		);	
	}
});

app.post('/UpdateChannelInfo', function (req, res) {
	try{	
		// create Request object
		var request = new sql.Request();
		
		var rtc_id = req.body.RTCId;
		var endpoint_id = req.body.EndpointId;
		var endpoint_type = req.body.EndpointType;
		
		// query to the database and get the data
		request.query("select * from ClientChannels WHERE EndpointId=" + endpoint_id, function (err, recordset) {

			if (err) {
				console.log(err);
				
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
					})
				);		
				
				return;
			}
			
			var request1 = new sql.Request();
			if(recordset.recordset.length < 1){
				request1.query("INSERT INTO ClientChannels (EndpointId, RTCId, Type) VALUES (" + endpoint_id + ", '" + rtc_id + "', " + endpoint_type + ")", function (err1, recordset1) {
					if (err1){
						console.log(err1);
						
						res.send(        
							JSON.stringify({
								return_code: 1001,
								data: "",
							})
						);	
						
						return;
					}
					// send data as a response
					res.send(   
						JSON.stringify({				
							return_code: 1000,
							data: JSON.stringify({
								EndpointId: endpoint_id,
								RTCId: rtc_id,
							})
						})
					);				
				});
			}else{
				request1.query("UPDATE ClientChannels SET RTCId='" + rtc_id + "',Type=" + endpoint_type + " WHERE EndpointId=" + endpoint_id, function (err1, recordset1) {
					if (err1){
						console.log(err1);
						
						res.send(        
							JSON.stringify({
								return_code: 1001,
								data: "",
							})
						);	
						
						return;
					}
					// send data as a response
					res.send(   
						JSON.stringify({				
							return_code: 1000,
							data: JSON.stringify({
								EndpointId: endpoint_id,
								RTCId: rtc_id,
							})
						})
					);
				});
			}
		});
	}catch(Exception){
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1002,
				data: "",
			})
		);	
	}
});

app.post('/GetRTCIdByEndpointId', function (req, res) { 
	try{
		// create Request object
		var request = new sql.Request();

		var endpoint_id = req.body.EndpointId;
		
		// query to the database and get the data
		request.query("select * from ClientChannels WHERE EndpointId=" + endpoint_id, function (err, recordset) {

			if (err) {
				console.log(err);
				
				// Send Response
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
					})
				);		
				return;			
			}
			
			if(recordset.recordset.length == 1){
				// send data as a response
				res.send(        
					JSON.stringify({
						return_code: 1000,
						data: recordset.recordset[0],
					})
				);
			}else{
				res.send(        
					JSON.stringify({
						return_code: 1000,
						data: JSON.stringify({
							EndpointId: endpoint_id,
							RTCId: "",
						})
					})
				);
			}
		});
	}catch(Exception){
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1002,
				data: "",
			})
		);	
	}
});

app.post('/GetEndpointIdByRTCId', function (req, res) { 

	try{
		// create Request object
		var request = new sql.Request();

		var rtc_id = req.body.RTCId;

		// query to the database and get the data
		request.query("select * from ClientChannels WHERE RTCId='" + rtc_id + "'", function (err, recordset) {

			if (err) {
				console.log(err);
				
				// Send Response
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
					})
				);	
				return;
			}
			
			if(recordset.recordset.length == 1){
				// send data as a response
				res.send(        
					JSON.stringify({
						return_code: 1000,
						data: recordset.recordset[0],
					})
				);
			}else{
				res.send(        
					JSON.stringify({
						return_code: 1000,
						data: JSON.stringify({
							EndpointId: 0,
							RTCId: rtc_id,
						})
					})
				);
			}
		});
	}catch(Exception){
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1002,
				data: "",
			})
		);	
	}
});

app.post('/GetEndpointById', function (req, res) { 
	try{
		// create Request object
		var request = new sql.Request();

		var endpoint_id = req.body.EndpointId;
				
		// query to the database and get the data
		request.query("select * from Endpoints WHERE Id=" + endpoint_id, function (err, recordset) {

			if (err) {
				console.log(err);
				
				// Send Response
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
					})
				);		
				return;			
			}
			
			if(recordset.recordset.length == 1){
				// send data as a response
				res.send(        
					JSON.stringify({
						return_code: 1000,
						data: recordset.recordset[0],
					})
				);
			}else{
				res.send(        
					JSON.stringify({
						return_code: 1003,
						data: ""
					})
				);
			}
		});
	}catch(Exception){
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1002,
				data: "",
			})
		);	
	}
});

app.post('/GetDispatchers', function (req, res) { 
	try{
		// create Request object
		var request = new sql.Request();
	
		// query to the database and get the data
		request.query("select * from ClientChannels WHERE Type=0 OR TYPE=1", function (err, recordset) {

			if (err) {
				console.log(err);
				
				// Send Response
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
					})
				);		
				return;			
			}

			// send data as a response
			res.send(        
				JSON.stringify({
					return_code: 1000,
					data: recordset.recordset
				})
			);
		});
	}catch(Exception){
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1002,
				data: "",
			})
		);	
	}
});

app.post('/UploadFile', function(req, res){

	console.log('Uploading a file');
	// create an incoming form object
	var form = new formidable.IncomingForm();
  
	// specify that we want to allow the user to upload multiple files in a single request
	form.multiples = true;
  
	// store all uploads in the /uploads directory
	form.uploadDir = path.join(__dirname, '/uploads');
  
	// log any errors that occur
	form.on('error', function(err) {
	  console.log('An error has occured: \n' + err);
	});
  
	// once all the files have been uploaded, send a response to the client
	form.on('end', function() {	  
	  console.log('Uploading is success!');
	  var temp_path = this.openedFiles[0].path;
	  console.log(temp_path);
	  res.end(path.basename(temp_path));
	});
  
	// parse the incoming request containing the form data
	form.parse(req);
  
});

// Listen on port 8080
webServer.listen(8080, function () {
    console.log('listening on http://localhost:8080');
});
