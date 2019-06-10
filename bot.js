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
const sendRandomItem = (partner) => {
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
				}
			});
		}
	});
};
const checkItem = (steamid,appid,contextid,myItem) => {
	manager.loadUserInventory(steamid, appid, contextid, true, (err, theirInv) => {
			if (err) {
				console.log(err);
			} else {
				const theirItem = theirInv[myItem];
				offer.addTheirItem(theirItem);
				offer.send((err, status) => { if (err) { console.log(err); } else { console.log(`Sent a random item offer. Status: ${status}.`); }});
			  }});
};

const acceptOffer = (offer,reason,status) => {
	offer.accept((err) => {
		if (err) console.log("Error occured:" + err)
		else
		console.log(`Accepted offer successfully. Status: ${status}. Reason: ${reason}`);
	});
};

const declineOffer = (offer,reason,status) => {
	offer.decline((err) => {
		if (err) console.log("Error occured:" + err);
		else
		console.log(`Declined offer successfully. Status: ${status}. Reason: ${reason}`);
	});
};

const processOffer = (offer) => {
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
const sqlconnect = () => {
	try {
		con.connect(function(err) {
			if (err) throw err
			console.log("Connected to SQL database server!");
		});
	}
	catch(e){ console.log('Error happened');}
};

const items_receive = (offer) => {
	console.log('Received:');
	offer.itemsToReceive.forEach(function(item) {
		console.log("Name: " + item.market_name + "   Quality:" + item.app_data.quality);
	});
};

const items_give = (offer) => {
	console.log('Gived:');
	offer.itemsToGive.forEach(function(item) {
		console.log("Name: " + item.market_name + "   Quality:" + item.app_data.quality);
	});
};

const glue_sep_arr = (array, separator) => {
	const resultArr = filter_arr(array, separator);
	let lstIndx = resultArr.lstIndx;
	let fstIndx = resultArr.fstIndx;
	let removed_array = array.slice(fstIndx, lstIndx+1);
	let removed_array_end=[];
	if (lstIndx !== array.length-1) removed_array_end = array.slice(lstIndx+1,array.length);
	let removed_array_begin = array.slice(0,fstIndx);
	let removed_str = removed_array.join(" ");
	removed_array_begin.push(removed_str.slice(1,removed_str.length-1));
	Array.prototype.push.apply(removed_array_begin, removed_array_end);
	let new_array = removed_array_begin;
	return { array: new_array, lstId: lstIndx, fstId: fstIndx };
};

const filter_arr = (array,separator) => {
	const array_filtered = array.filter(item => item.indexOf(separator) !== -1);
	let lastIndex = array.indexOf(array_filtered[array_filtered.length-1]);
	let firstIndex = array.indexOf(array_filtered[0]);
	if (firstIndex !== lastIndex) {return { array: array_filtered, lstIndx: lastIndex, fstIndx: firstIndex
	};} else {return{array: array_filtered, Indx: lastIndex};}
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
	let timech = 5000;
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
		case '!bot':
		{
			switch(commandArr[1]){
				case 'prices':{
					con.query("select * from prices;", function (err, result) {
						if (err) throw err;
						result.forEach(function(price){
							client.chatMessage(steamID, '/code ' + price.item_name + '(' + price.item_id + '): Buying for ' + price.key_buy + ' key ' + price.ref_buy + ' ref / Selling for ' + price.key_sell + ' key ' + price.ref_sell + ' ref');
						});
					});
				};break;
				case 'add':{
					if (commandArr.length == 2){ client.chatMessage(steamID, '/code How to: !bot add <table> '); client.chatMessage(steamID, '/code Example: !bot add prices ... '); };
					if (commandArr[2] == 'prices'){
						const array_filtered_length = filter_arr(commandArr,"'").array.length;
						if (array_filtered_length > 1){
							commandArr = glue_sep_arr(commandArr,"'").array;
						}else if (array_filtered_length === 1) {
							let Index = filter_arr(commandArr,"'").Indx;
							commandArr[Index] = commandArr[Index].slice(1,commandArr[Index].length-1);
							console.log(commandArr[Index]);	
						};
						if (commandArr.length == 3){ 
							client.chatMessage(steamID, '/code How to: !bot add prices <item_name> <item_id> <ref_buy> <ref_sell> <key_buy> <key_sell> <item_name_color> <...>');
							client.chatMessage(steamID, '/code Example: !bot add prices \'Mann Co. Supply Crate Key\' 5021 51.55 51.77 0 0 0 ');
						} else if(commandArr.length > 9) {
							con.query("INSERT into prices (item_name,item_id,ref_buy,ref_sell,key_buy,key_sell,item_name_color) values ('"+ commandArr[3] +"',"+ commandArr[4] +","+ commandArr[5] +","+ commandArr[6] +","+ commandArr[7] +","+ commandArr[8] +",'"+ commandArr[9]+"');", function (err, result) {
								if (err) throw err;
								client.chatMessage(steamID,'/pre Added a record to the table prices.');
							});
						};
						if (commandArr.length <10 && commandArr.length >3){
							client.chatMessage(steamID,'/pre Not enough arguments.');
						}
					};
				};break;
				case 'update':{
					
				};break;
			};
		};break;
	}
});
//INSERT into prices (item_name,price_refb,price_keyb,price_refs,price_keys,id) values ('name',prb,prs,pkb,pks,id,namecolor);


