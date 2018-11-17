const db = require('edudb');

module.exports = {
/**
 * Check if user's IP is blacklisted. True if user isn't blacklisted and false if it is.
 * @param {string} ip User's IP.
 * @returns {boolean} Indicates if given IP is banned.
 */
checkIfBlacklisted: function(ip) {
	if(ip != undefined) {
		var x = db.find(['ip', ip], 'blacklist');

		if(x != undefined) {
			return false;
		} else {
			return true;
		}
	} else {
		return false;
	}
}, // Done

/**
 * Blacklist the given IP so it can't load the site.
 * @param {string} ip User's IP.
 * @param {string} reason Why user was banned ("Admin needs" by default.)
 * @returns {void}
 */
addToBlacklist: function(ip, reason = "Admin neeeds.") {
	if(ip != undefined) {
		var blacklist = db.get('blacklist');
		blacklist.push({
			ip:ip, // text
			reason:reason, // large text
			since:new Date().getTime() // new Date().getTime() : time in milliseconds for when user was banned
		});

		db.save('blacklist', blacklist);

	} else {
		console.error("An error has ocurred while adding to blacklist. There's no ip specified.");
	}
}, // Done

/**
 * Check if user already has a valid session in database
 * @param {string} ip User's IP.
 * @returns {boolean} True if given IP has a session stored in database.
 */
checkIfHasSession: function(ip) {
	if(ip != undefined) {
		var user = db.find(['ip', ip], 'sessions');

		if(typeof user === 'object') {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}, // Done

/**
 * To get info about user's ban. It contains the ip, reason and date since ban.
 * @param {string} ip User's IP
 * @returns {object|undefined} Returns undefined or an object depending if user is blacklisted. The object contains the row that is stored in database.
 */
getBlacklistInfo: function(ip) {
	if(checkIfBlacklisted(ip)) {
		var data = db.find(['ip', ip], 'blacklist');

		return data.row;
	} else {
		return undefined;
	}
}
} // module closing 