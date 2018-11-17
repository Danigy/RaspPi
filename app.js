const express = require('express');
const db = require('edudb');
const session = require('express-session');
const uuid = require('uuid-js');
const fs = require('fs');
const auth = require('./auth');

const HOST = 'localhost';
const PORT = 3000;
const app = express();
var LOG_ID = 0;

db.createTable('sessions', {
	structure: {
		id:0,
		ip:0,
		loggedIn:false
	}
});

db.createTable('userCredentials', {
	structure: {
		username:"", // text
		password:"", // text
		mail:"", // text
		id:0, // number
		lastIp:"", // req.ip
		lastSession:"datestamp", // new Date().getTime()
		memberSince:0 // number in milliseconds
	}
});

db.createTable('blacklist', {
	structure: {
		ip:"", // text
		reason:"", // large text
		since:"" // new Date().getTime() : time in milliseconds for when user was banned
	}
});

app.listen(PORT, HOST, function() {
	console.log("Server listening at %s:%s from %s", HOST, PORT, __dirname);
});

function getDate(ms = new Date().getTime()) {
	var d = new Date(ms);
	var h = d.getHours().toString().length == 1 ? "0"+d.getHours() : d.getHours();
	var m = d.getMinutes().toString().length == 1 ? "0"+d.getMinutes() : d.getMinutes();
	var s = d.getSeconds().toString().length == 1 ? "0"+d.getSeconds() : d.getSeconds();

	return {
		date: (d.getMonth()+1) + "-" + d.getDate() + "-" + d.getFullYear(),
		time: h + ":" + m,
		timews: h + ":" + m + ":" + s
	}
}

function Log(sender, msg) {
	if(typeof sender === 'number') sender = sender.toString();

	var d = getDate();
	var data = "\n" + LOG_ID + " "+ d.timews +" ["+sender.toUpperCase()+"] " + msg;

	fs.appendFile('./logs/log_' + d.date + '.log', data, function(err) {
		if(err) console.error("Error while Log!");
	})
}

// ######### SERVER #########
app.get("/", function(req, res) {
	if(auth.checkIfBlacklisted(req.ip)) {
		res.end(res.send('200: OK!'));
		Log("main", "User with ip "+req.ip+" joined the server!");
	} else {
		console.log(auth.getBlacklistInfo(req.ip));
		res.end();
	}
});