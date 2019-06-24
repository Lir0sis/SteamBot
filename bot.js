const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');
const mysql = require('mysql');
const steamUserInfo = require('steam-userinfo');
const config = require('./config.json');
require('colors');
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
const sqlConnect = () => {
	try {
		con.connect(function(err) {
			if (err) throw err
			console.log("Connected to SQL database server!");
		});
	}
	catch(e){ console.log('Error happened');}
};


const itemsToReceive = (offer) => {
	let messageBegin = "Received:".underline.white;
	let tradeMessage = "";
	if (offer.itemsToReceive !== undefined) offer.itemsToReceive.forEach(function(item) {
		tradeMessage += " " + item.market_name + "(" + item.app_data.quality + ")" + ",";
	});
	if (offer.itemsToReceive === undefined) tradeMessage = 'Nothing to receive';
	console.log(messageBegin + tradeMessage.green);
};

const itemsToGive = (offer) => {
	let messageBegin = 'Lost:'.underline.white;
	let tradeMessage = "";
	if (offer.itemsToGive !== undefined) offer.itemsToGive.forEach(function(item) {
		tradeMessage += " " + item.market_name + "(" + item.app_data.quality + ")" + ",";
	});
	if (tradeMessage === undefined) tradeMessage = ' Nothing to give';
	console.log(messageBegin + tradeMessage.orange);
};

const glueArrayElements = (array, separator) => {
	const resultArr = filterArray(array, separator);
	let lstIndx = resultArr.lstIndx;
	let fstIndx = resultArr.fstIndx;
	let removedArray = array.slice(fstIndx, lstIndx+1);
	let removedArrayEnd=[];
	if (lstIndx !== array.length-1) removedArrayEnd = array.slice(lstIndx+1,array.length);
	let removedArrayBegin = array.slice(0,fstIndx);
	let removedString = removedArray.join(" ");
	removedArrayBegin.push(removedString.slice(1,removedString.length-1));
	removedArrayBegin = removedArrayBegin.concat(removedArrayEnd);
	let newArray = removedArrayBegin;
	return { array: newArray, lstId: lstIndx, fstId: fstIndx };
};

const filterArray = (array,separator) => {
	const filteredArray = array.filter(item => item.indexOf(separator) !== -1);
	let lastIndex = array.indexOf(filteredArray[filteredArray.length-1]);
	let firstIndex = array.indexOf(filteredArray[0]);
	if (firstIndex !== lastIndex) {return { array: filteredArray, lstIndx: lastIndex, fstIndx: firstIndex
	};} else {return{array: filteredArray, Indx: lastIndex};}
};

//----------------------------------------------------------------

client.logOn(logOnOptions);

//steamUserInfo.setup(config.steamApiKey);

setTimeout(sqlConnect, 1000);

client.on('loggedOn', () => {
	client.setPersona(SteamUser.EPersonaState.Offline);
	client.gamesPlayed(440);
	console.log(`Logged in Steam account!`);
});

client.on('webSession', (sessionid, cookies) => {
	manager.setCookies(cookies);
	community.setCookies(cookies);
	let timech = 5000;
	community.startConfirmationChecker(timech, config.identitySecret);
	console.log(`Connected to Steam community. Started Confirmations checker every ${timech} ms`);
});

manager.on('newOffer', offer => {
	if (offer.partner.getSteamID64() === config.botOwner) { 
		acceptOffer(offer,"Bot owner",offer.status);  
		console.log('-----------------New-Offer-----------------'.cyan);
		itemsToReceive(offer);
		itemsToGive(offer);
	}
});

client.on("friendMessage", function(steamID, message) {	
	let cmdArray = [];
	let steamUserNameT;
	cmdArray = message.split(" ");

	/*
	steamUserInfo.getUserInfo(steamID, function(error, data, steamUserNameT){
		if(error) throw error;
		steamUserNameT = JSON.stringify(data.response);
	});
	*/

	switch(cmdArray[0]){
		case '!bot':
		{
			switch(cmdArray[1]){
				case 'prices':{
					if (cmdArray.length === 2){
						con.query("select * from prices;", function (err, result) {
							if (err) throw err;
							result.forEach(function(price){
								client.chatMessage(steamID, '/quote ' + price.item_name + '(' + price.item_id + '): Buying for ' + price.key_buy + 
								' key ' + price.ref_buy + ' ref / Selling for ' + price.key_sell + ' key ' + price.ref_sell + ' ref');
							});
						});
					console.log(steamUserNameT + "(" + steamID + ") checked prices");
					} else if (cmdArray[2] === 'columns'){
						client.chatMessage(steamID,'/quote Columns are: item_id, item_name, ref_buy, ref_sell, key_buy, key_sell, item_name_color');
						//console.log(steamUserNameT + "(" + steamID + ") checked prices' columns");
					};
				};break;
				case 'add':{
					if (cmdArray.length === 2){ 
						client.chatMessage(steamID, '/quote How to: /quote add <table> '); 
						client.chatMessage(steamID, '/quote Example: /quote add prices ... '); 
					};
					if ( cmdArray[2] === 'prices'){
						const filteredArrayLength = filterArray(cmdArray,"'").array.length;
						if ( filteredArrayLength > 1 ){
							cmdArray = glueArrayElements(cmdArray,"'").array;
						} else if ( filteredArrayLength === 1 ) {

							let Index = filterArray(cmdArray,"'").Indx;
							cmdArray[Index] = cmdArray[Index].slice(1,cmdArray[Index].length-1);
							console.log(cmdArray[Index]);	

						};
						if ( cmdArray.length === 3 ){ 

							client.chatMessage(steamID, '/quote How to: /quote add prices <item_name> <item_id> <ref_buy>'+ 
							'<ref_sell> <key_buy> <key_sell> <item_name_color> <...>');
							client.chatMessage(steamID, '/quote Example: /quote add prices \'Mann Co. Supply Crate Key\' 5021 51.55 51.77 0 0 0 ');

						} else if(cmdArray.length > 9) {
							con.query("INSERT into prices (item_name,item_id,ref_buy,ref_sell,key_buy,key_sell,item_name_color)" + 
							" values ('"+ cmdArray[3] +"',"+ cmdArray[4] +","+ cmdArray[5] +","+ cmdArray[6] +
							","+ cmdArray[7] +","+ cmdArray[8] + ",'"+ cmdArray[9]+"');", function (err, result) {

								if (err) throw err;
								client.chatMessage(steamID,'/quote Added a record to the table prices.');

							});

						};

						if (cmdArray.length <10 && cmdArray.length >3){
							client.chatMessage(steamID,'/quote Not enough arguments.');

						}

					};

				};break;
				case 'update':{

					if (cmdArray.length === 2){ 
						client.chatMessage(steamID, '/quote How to: /quote update <table> '); 
						client.chatMessage(steamID, '/quote Example: /quote update prices ... '); 
					};
					
					if ( cmdArray[2] === 'prices'){
					
						const filteredArrayLength = filterArray(cmdArray,"'").array.length;
						if ( filteredArrayLength > 1 ){
							cmdArray = glueArrayElements(cmdArray,"'").array;
						} else if ( filteredArrayLength === 1 ) {

							let Index = filterArray(cmdArray,"'").Indx;
							cmdArray[Index] = cmdArray[Index].slice(1,cmdArray[Index].length-1);
							console.log(cmdArray[Index]);	

						};
						if ( cmdArray.length === 3 ){ 

							client.chatMessage(steamID, '/quote How to: /quote update prices <item_id_value> <filt_param> <filt_param_value> ' + 
							'<param_to_update> <param_to_update_value>');
							client.chatMessage(steamID, '/quote Example: /quote update prices 5021 item_name_color #FFD700 item_name \'Mann Co. Supply Crate Key\''+
							' - filters item by name color and updates item\'s name with 5021 id');

						} else if(cmdArray.length > 7) {

							con.query("Update prices set " + cmdArray[6]+"='"+ cmdArray[7]+ "'" + " where item_id='"+ cmdArray[3] +"' and "+ cmdArray[4]+ 
							"='"+ cmdArray[5] +"';", function (err, result) {
								if (err) throw err;
								client.chatMessage(steamID,'/quote Updated record.');
							});
						};

						if (cmdArray.length <8 && cmdArray.length >3){
							client.chatMessage(steamID,'/quote Not enough arguments.');
							client.chatMessage(steamID,cmdArray.join(','));
						}
						if (cmdArray.length > 8){
							client.chatMessage(steamID,'/quote Too much arguments');
							client.chatMessage(steamID,cmdArray.join(','));
						}

						
					};

				};break;
			};
		};break;
	}
});
//INSERT into prices (item_name,price_refb,price_keyb,price_refs,price_keys,id) values ('name',prb,prs,pkb,pks,id,namecolor);


