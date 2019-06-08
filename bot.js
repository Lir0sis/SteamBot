const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');
const mysql = require('mysql');
const config = require('./config.json');
//-------------------------------------------------------------------
const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
	steam: client,
	community: community,
	language: 'en'
});
const con = mysql.createConnection({
	host: config.ipSQL,
	user: config.userSQL,
	password: config.passSQL,
	database: config.dbSQL,
	port: config.portSQL
});
const logOnOptions = {
	accountName: config.username,
	password: config.password,
	twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
};
//---------------------------------------------------------------------
function sendRandomItem(partner) {
	const appid = 440;
	const contextid = 2;
	const offer = manager.createOffer(partner);
	manager.loadInventory(appid, contextid, true, (err, myInv) => { if (err) { console.log(err); } 
	else {
		const myItem = myInv[Math.floor(Math.random() * myInv.length - 1)];
		offer.addMyItem(myItem);
		manager.loadUserInventory(partner, appid, contextid, true, (err, theirInv) => {
			if (err) {
				console.log(err);
			} else {
				const theirItem = theirInv[Math.floor(Math.random() * theirInv.length - 1)];
				offer.addTheirItem(theirItem);
				offer.setMessage(`Думаю тебе понравиться мой ${myItem.name} за твой ${theirItem.name}.`);
				offer.send((err, status) => { if (err) { console.log(err); } else { console.log(`Sent a random item offer. Status: ${status}.`); } });
			  }});}});
}
function acceptOffer(offer,reason,status) {
	offer.accept((err) => {
		if (err) console.log("Error occured:" + err)
		else
		console.log(`Accepted offer successfully. Status: ${status}. Reason: ${reason}`.green);
	});
};
function declineOffer(offer,reason,status) {
	offer.decline((err) => {
		if (err) console.log("Error occured:" + err);
		else
		console.log(`Declined offer successfully. Status: ${status}. Reason: ${reason}`.red);
	});
};
function processOffer(offer){
	if (offer.Glitched() || offer.state === 11) {
		declineOffer(offer,'Glitched',offer.status);
	} else if (offer.partner.getSteamID64() === config.botOwner) { acceptOffer(offer,"Bot owner",offer.status); }
	else {
		var ourItems = offer.itemsToGive;
		var theirItems = offer.itemsToReceive;
		var ourValue = 0;
		var theirValue = 0;
		for (var i in ourItems) {
//WIP			var item = ourItems[i]. 
		}
	}
};
function sqlconnect(){
	try {
		con.connect(function(err) {
		if (err) throw err;
		console.log("Connected to SQL database server!");
		});
	} catch(e) { console.log("Didn't connected to SQL!"); };
};
//----------------------------------------------------------------

client.logOn(logOnOptions);

client.on('loggedOn', () => {
	client.setPersona(SteamUser.EPersonaState.Offline);
	//client.gamesPlayed(['Trading',440]);
	console.log(`Logged in Steam account!`);
});

client.on('webSession', (sessionid, cookies) => {
  manager.setCookies(cookies);
  community.setCookies(cookies);
  var timech = 5000;
  community.startConfirmationChecker(timech, config.identitySecret);
  console.log(`Connected to Steam community. Started Confirmations checker every ${timech} ms`);
});

setTimeout(sqlconnect,4000);

manager.on('newOffer', offer => {
  if (offer.partner.getSteamID64() === config.botOwner) { acceptOffer(offer,"Bot owner",offer.status); console.log(offer.itemsToReceive[1].EconItem.name);}    
	});


client.on("friendMessage", function(steamID, message) {
	switch(message){
		case '!randomisgood':
		{
			client.chatMessage(steamID, "Agree! :3");
			sendRandomItem(steamID)
		}; break;
		/*case '!db check':
		{
			con.query("select * from prices;", function (err, result) {
				if (err) throw err;
			try {client.chatMessage(steamID, result[3].item_name); } catch(MessErr){ client.chatMessage(steamID, 'end of the table'); };
				console.log(steamID + " checked database");
			});
		}*/
	
	}
});




