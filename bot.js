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
				console.log(myItem);
				offer.send((err, status) => { if (err) { console.log(err); } else { console.log(`Sent a random item offer. Status: ${status}.`); }});
			  }});
		}});
};
function checkItem(steamid,appid,contextid,myItem){
	manager.loadUserInventory(steamid, appid, contextid, true, (err, theirInv) => {
			if (err) {
				console.log(err);
			} else {
				const theirItem = theirInv[myItem];
				offer.addTheirItem(theirItem);
				offer.send((err, status) => { if (err) { console.log(err); } else { console.log(`Sent a random item offer. Status: ${status}.`); }});
			  }});
};
function acceptOffer(offer,reason,status) {
	offer.accept((err) => {
		if (err) console.log("Error occured:" + err)
		else
		console.log(`Accepted offer successfully. Status: ${status}. Reason: ${reason}`);
	});
};
function declineOffer(offer,reason,status) {
	offer.decline((err) => {
		if (err) console.log("Error occured:" + err);
		else
		console.log(`Declined offer successfully. Status: ${status}. Reason: ${reason}`);
	});
};
function processOffer(offer){
	if (offer.Glitched() || offer.state === 11) {
		declineOffer(offer,'Glitched',offer.status);
	} else if (offer.partner.getSteamID64() === config.botOwner) { acceptOffer(offer,"Bot owner",offer.status); }
	else {
		let ourItems = offer.itemsToGive;
		let theirItems = offer.itemsToReceive;
		let ourValue = 0;
		let theirValue = 0;
		for (let i in ourItems) {
//WIP			let item = ourItems[i]. 
		}
	}	
};
function sqlconnect(){
	try {
		con.connect(function(err) {
			if (err) throw err
			console.log("Connected to SQL database server!");
		});
	}
	catch(e){ console.log('Error happened');}
};
function items_receive(offer){
	console.log('Received:');
	offer.itemsToReceive.forEach(function(item) {
		console.log("Name: " + item.market_name + "   Quality:" + item.app_data.quality);
	});
};
function items_give(offer){
	console.log('Gived:');
	offer.itemsToGive.forEach(function(item) {
		console.log("Name: " + item.market_name + "   Quality:" + item.app_data.quality);
	});
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

setTimeout(sqlconnect, 1000);

manager.on('newOffer', offer => {
  if (offer.partner.getSteamID64() === config.botOwner) { 
	acceptOffer(offer,"Bot owner",offer.status);  
	items_receive(offer);
	items_give(offer);
	console.log(offer.itemsToReceive);
  }
	});


client.on("friendMessage", function(steamID, message) {
	let commandArr = [];
	commandArr = message.split(" ");
	switch(commandArr[0]){
		/*case '!db check':
		{
			con.query("select * from prices;", function (err, result) {
				if (err) throw err;
			try {client.chatMessage(steamID, result[1]); } catch(e){ client.chatMessage(steamID, 'end of the table'); };
				console.log(steamID + " checked database");
			});
		};break;
		case:
		{
			client.chatMessage(steamID, commandArr.join('/'));
			commandArr.forEach(function(command_item){
				client.chatMessage(steamID, command_item);
			});
			console.log(commandArr + " " + commandArr.length);
		}*/
		case '!bot':
		{
			//if ()
			switch(commandArr[1]){
				case 'prices':{
					con.query("select * from prices;", function (err, result) {
						if (err) throw err;
						result.forEach(function(price){
							client.chatMessage(steamID, '/code ' + price.item_name + '(' + price.item_id + '): Buying for ' + price.price_key_buy + ' key ' + price.price_ref_buy + ' ref / Selling for ' + price.price_key_sell + ' key ' + price.price_ref_sell + ' ref');
						});
					});
				};break;
				case 'add':{
					if (commandArr.length == 2){
						client.chatMessage(steamID, '/code How to: !bot add <table> ');
						client.chatMessage(steamID, '/code Example: !bot add prices ... ');
						con.query("select * from prices;", function (err, result) {
							if (err) throw err;
							console.log(result);
						});
					};
					if (commandArr[2] == 'prices'){
						if (commandArr.length == 3){ 
							client.chatMessage(steamID, '/code How to: !bot add prices <item_name> <item_id> <price_ref_buy> <price_ref_sell> <price_key_buy> <price_key_sell> <item_name_color> <...>');
						}; /*else if(commandArr.length > 3) {
							//INSERT into prices (item_name,price_refb,price_keyb,price_refs,price_keys,id) values ('name',prb,prs,pkb,pks,id,namecolor);
							con.query("INSERT into prices (item_name,item_id,) values ('name',prb,prs,pkb,pks,id,namecolor);", function (err, result) {
								if (err) throw err;
								
							}
						};*/
					};
				};break;
			};
		};break;
	}
});



