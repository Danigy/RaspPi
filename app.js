/**
 * @todo
 * - Create register.html
 * - Do dashboard.html
 * 	 -> Create design
 * 	 -> Get server data through API
 */

const express = require('express');
const db = require('edudb');
const sd = require('edudb'); // Server Data
const session = require('express-session');
const bodyParser = require('body-parser');
const uuid = require('uuid-js');
const fs = require('fs');
const auth = require('./auth');

const HOST = 'localhost';
const PORT = 3000;
const app = express();
const API = express();
var LOG_ID = 0;

app.use("/API", API);
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

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
		memberSince:0, // number in milliseconds
		serverID:"" // server name
	}
});

db.createTable('blacklist', {
	structure: {
		ip:"", // text
		reason:"", // large text
		since:"" // new Date().getTime() : time in milliseconds for when user was banned
	}
});

sd.config({root:'./serverData'});

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
		LOG_ID++;
	})
}

/**
 * Set as parameter in res.json(serveFile(path, obj)) to send file AND data like user profile.
 * @param {string} path Path to file.
 * @param {object} obj Object with data to send.
 */
function serveFile(path, obj) {
	var html = fs.readFileSync(path);
	return {
		html: html,
		data: obj
	}
}

// ######### SERVER #########
app.get("/", function(req, res) {
	if(auth.checkIfBlacklisted(req.ip)) {
		res.sendFile('home.html', {root: './public_html/'});
		Log("main", "User with ip "+req.ip+" joined the server!");
	} else {
		res.end(auth.getBlacklistInfo(req.ip));
	}
});

// Login form
app.post("/", function(req, res) {
	if(auth.checkIfBlacklisted(req.ip)) {
		var userCredentials = db.find(['mail', req.body.mail, 'password', req.body.pw], "userCredentials");
		if(userCredentials != undefined) {
			// Get table and data to edit
			var user = db.get('userCredentials');
			var data = user[userCredentials.index];
			
			// Update credentials
			data.lastIp = req.ip;
			data.lastSession = new Date().getTime();
			db.save('userCredentials', user);

			res.redirect("/dashboard/"+data.serverID);
			
		} else {
			res.end("There's no registered user with these credentials. Send a message to administration at lasangresroja@gmail.com or try later!");
			Log('login', req.ip +" tried to access dashboard with credentials "+req.body.mail+" "+req.body.pw);
		}
	} else {
		res.end(auth.getBlacklistInfo(req.ip));
	}
});

// Dashboard
app.get("/dashboard/:id", function(req, res) {
	// To get id = req.params.id
	if(auth.checkIfBlacklisted(req.ip)) {
		res.end("Passed Blacklist");
	} else {
		req.end(auth.getBlacklistInfo(req.ip));
	}
});

// Register - Only LOCAL (127.0.0.1) can register users
app.get("/register", function(req, res) {
	if(req.ip == "127.0.0.1") {
		res.sendFile('register.html', {root: './public_html'});
	} else {
		res.end("Error: You don't have permission to access this site.");
	}
});

/* Registering - Only LOCAL (127.0.0.1) can register users
 * Options: {
		serverID: server name - same as userCredentials,,
		key: changeable. Just randomly generated
		owners: [],
		ownersMail: [],
		port: number. There's no IP because
 * }
 */
app.post("/register", function(req, res) {
	if(req.ip == "127.0.0.1") {
		var options = req.body;
		sd.createTable(options.serverID, {
			structure: {
				serverID: options.serverID,
				key: options.key,
				owners: options.owners,
				ownersMail: options.mails,
				port: options.port
			}
		});

		var table = sd.get(options.serverID);
		table.push({
			serverID: options.serverID,
			key: options.key,
			owners: options.owners,
			ownersMail: options.mails,
			port: options.port
		});
		sd.save(options.serverID, table);

		Log("register", "Local stored a new server in "+ sd.root + "/" + options.serverID + ".json");
	} else {
		res.end("Error: You don't have permission to access this site.");
	}
});


/*
 * 					API SERVER
 * 	This server sends server and app data.
 * 	It doesn't need a web browser to be acceded and
 * 	will be adapted to be independent to the app server.
*/

// This sends all the information about the server from :id user
API.get("/:id&:key", function(req, res) {
	if(auth.checkIfBlacklisted(req.ip)) {
		if(req.params.id != undefined) {
			if(sd.exists(req.params.id)) {
				var user = sd.find(["key", req.params.key, "serverID", req.params.id], 'serverData');

				if(user != undefined) {
					res.json(user.row);
				} else {
					res.send("API Error: Wrong credentials to access server data.");
				}
			} else {
				res.send("API Error: There's no server with that ID.");
			}
		} else {
			res.send("API Error: You must specify the ID of your server in /API/id");
		}
	} else {
		res.end(auth.getBlacklistInfo(req.ip));
	}
});