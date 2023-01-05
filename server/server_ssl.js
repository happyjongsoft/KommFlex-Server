// Load required modules
var https   = require("https");     // https server core module
var fs      = require("fs");        // file system core module
var express = require("express");   // web framework external module
var io      = require("socket.io"); // web socket external module
var serveStatic = require('serve-static');  // serve static files
var sql = require("mssql");
var path = require('path');
var formidable = require('formidable');
var moment = require('moment');

// This sample is using the easyrtc from parent folder.
// To use this server_example folder only without parent folder:
// 1. you need to replace this "require("../");" by "require("easyrtc");"
// 2. install easyrtc (npm i easyrtc --save) in server_example/package.json

var easyrtc = require("../"); // EasyRTC internal module

// Setup and configure Express http server. Expect a subfolder called "static" to be the web root.
var httpApp = express();
httpApp.use(serveStatic('static', {'index': ['index.html']}), express.urlencoded(), express.static(path.join(__dirname, 'uploads')));
httpApp.use(express.json());

var config = {
	"user": "sa", 
	"password": "Video2019",
	"server": "172.16.1.6", 
	"database": "happyvideocom", 
	"options": {
		"encrypt": true
	}
}

sql.connect(config).catch(err => {
	console.log('----------------');
	console.log(err);
});

sql.on('error', err => {
	console.log('===================ERROR======================');
	console.log(error);
});

// Start Express https server on specific port
var webServer = https.createServer({
    key:  fs.readFileSync(__dirname + "/certs/cert.key"),
    cert: fs.readFileSync(__dirname + "/certs/cert.crt"),
    passphrase: 'asdf'
}, httpApp);

// Start Socket.io so it attaches itself to Express server
var socketServer = io.listen(webServer, {"log level":1});

// Start EasyRTC server
var rtc = easyrtc.listen(httpApp, socketServer);


httpApp.post('/', function (req, res) { 
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

httpApp.post('/UpdateChannelInfo', function (req, res) {
	try{	
		// create Request object
		var request = new sql.Request();
		
		var rtc_id = req.body.RTCId;
		var endpoint_id = req.body.EndpointId;
		var endpoint_type = req.body.EndpointType;
		var station_id = req.body.StationId;
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
				request1.query("INSERT INTO ClientChannels (EndpointId, RTCId, Type, StationId) VALUES (" + endpoint_id + ", '" + rtc_id + "', " + endpoint_type + ", '" + station_id + "')", function (err1, recordset1) {
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
				request1.query("UPDATE ClientChannels SET RTCId='" + rtc_id + "',Type=" + endpoint_type + ",StationId='" + station_id + "' WHERE EndpointId=" + endpoint_id, function (err1, recordset1) {
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

httpApp.post('/GetRTCIdByEndpointId', function (req, res) { 
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

httpApp.post('/GetEndpointIdByRTCId', function (req, res) { 

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

httpApp.post('/GetEndpointById', function (req, res) { 
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

httpApp.post('/GetDispatchers', function (req, res) { 
	try{
		// create Request object
		var request = new sql.Request();
	
		var station_id = req.body.StationId;
		// query to the database and get the data
		request.query("select * from ClientChannels WHERE (Type=0 OR TYPE=1) AND StationId='" + station_id + "'", function (err, recordset) {

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

httpApp.post('/GetServerTime', function (req, res) { 
	try{
		// Send Response
		res.send(        
			JSON.stringify({
				return_code: 1000,
				data: moment().format('YYYY-MM-DD hh:mm:ss'),
			})
		);		
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

httpApp.post('/UploadFile', function(req, res){

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

httpApp.post('/AddCallLog', function(req, res){
	try{	
		// create Request object
		var request = new sql.Request();
		
		var client_endpoint_id = req.body.ClientEndpointId;
		var dispatcher_endpoint_id = req.body.DispatcherEndpointId;
		var start_time = req.body.StartTime;
		var end_time = req.body.EndTime;
		var passed_to_center = req.body.PassedToCenter;
		
		var request = new sql.Request();
		request.query("INSERT INTO CallLog (ClientEndpointId, DispatcherEndpointId, StartTime, EndTime, PassedToCenter) OUTPUT Inserted.id VALUES (" + client_endpoint_id + ", " + dispatcher_endpoint_id + ", '" + start_time + "', '" + end_time + "', " + passed_to_center + ")", function (err, recordset) {
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
			if(recordset.recordset.length > 0)
			{
				res.send(   
					JSON.stringify({				
						return_code: 1000,
						data: recordset.recordset[0]
					})
				);				
				
			}else{
				res.send(        
					JSON.stringify({
						return_code: 1001,
						data: "",
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

httpApp.post('/AddPictureLog', function(req, res){
	try{	
		// create Request object
		var request = new sql.Request();
		
		var log_id = req.body.LogId;
		var picture_list = req.body.PictureList;
		
		var request = new sql.Request();
		
		var json_picture_list = JSON.parse(picture_list);
		var i;
		var values = "";
						
		for(i = 0 ; i < json_picture_list.length; i++)
		{
			if(i > 0)
			{
				values = values + ",";
			}
			values = values + "('" + log_id + "','" + json_picture_list[i] + "')";
		}

		request.query("INSERT INTO PictureLog (LogId, PictureName) VALUES " + values + ";", function (err, recordset) {
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

			res.send(   
				JSON.stringify({				
					return_code: 1000,
					data: ""
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

httpApp.post('/PingFromEndpoint', function(req, res){
	try{	
		// create Request object
		var endpoint_id = req.body.EndpointId;
		var time_ping = moment().format('YYYY-MM-DD hh:mm:ss');
		
		// query to the database and get the data		
		var request = new sql.Request();
		request.query("UPDATE Endpoints SET LastPing='" + time_ping + "' WHERE Id=" + endpoint_id, function (err, recordset) {
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
			res.send(   
				JSON.stringify({				
					return_code: 1000,
					data: JSON.stringify({
						EndpointId: endpoint_id,
						Time: time_ping,
					})
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

// Listen on specific port
webServer.listen(443, function () {
    console.log('listening on https://localhost:443');
});
