
(function($) {
	

	var statusObject = {};
	var txcount = 0;
	var pvk;
	var unit = digibyte.Unit;
		
	class DigiPay {
		
		
		constructor(settings,main) {
			this.settings = settings;
			this.statusObject = {};
			this.data = this.fgp('data') || settings.data;
			var ppk = this.fgp('ppk');
			this.pvk = (ppk ? digibyte.PrivateKey.fromWIF(atob(ppk)) : new digibyte.PrivateKey());
			this.DGB = new DGBO();
			this.txcount = 0;
			this.unit = digibyte.Unit;
			this.bufferPrivateKey = this.pvk.toWIF().toString();
			this.bufferPublicAddress = this.pvk.publicKey.toAddress().toString();
			history.pushState('', '', '?ppk='+btoa(this.bufferPrivateKey)+'&data='+this.data);
			this.qrimage = $('<img src="img/qr.png"/>');
			this.main = $('<div class="digiwrapper"></div>');
			
			
			
			
			
			
		}
		
		
		
		getHtml() {
			// check if a session is already in the address
		

			
			
			
			
			
			
			
			// create pvk WIFF address from the pvk.

			
			// make savestate for if someone accidentaly presses F5
			
			
			/* Generate HT
			L */
			// main element
			this.main.append('<div style="height:'+(this.settings.size+40)+'px;" class="statusimage"></div> </div>'); 
			
			

			// add qr
			var qramount = this.unit.fromSatoshis(this.settings.amount+this.settings.fee).toBTC();
			
			
			this.qrimage.on('load',()=> {
				this.createQr({
					'text':"digibyte:"+this.bufferPublicAddress+'?amount='+qramount,
					'size':this.settings.size,
		
				})
				
			});
			

			
			
			// add details of transaction
					
			var details = $('<div class="details"></div>');
			
			details.append('<div class="amount">To pay '+this.unit.fromSatoshis(this.settings.amount).toBTC()+' DGB + ('+this.unit.fromSatoshis(this.settings.fee).toBTC()+'Fee)</div>');
			details.append('<div class="address">'+this.bufferPublicAddress+'</div>');
			details.append('<div class="txid">Txid:'+this.data+'</div>');
			
			this.main.append(details);
			
			// add status			

			this.main.append(
				this.createStatusbars()
			);		

			
			
			// check loop for payment check;
			this.checkPayment();
			
			if(this.settings.onInitialize) {
				// return a callback depending if it is set.
				this.settings.onInitialize({
					publicKey:this.bufferPublicAddress,
					privateKey:this.bufferPrivateKey,
				});
			}
			
			// Return the html element to be inserted using jquery
			
			return this.main;
		
		}
		
	
		
		
		
		createQr(qs) {
				// generate QR with qs settings
				
				qs.image = this.qrimage[0];
				qs.mode = 4
				qs.mSize = 0.30;
				qs.ecLevel = 'Q'
				return this.main.children('.statusimage').html($('<div class="qr"></div>').qrcode(qs).fadeIn('slow'));


		}
		
		createStatusbars() {
			
			// create 2 status bars that update according to stage in transaction
			var astatus = $('<div class="status"></div>');			
			var statusbar = $('<div class="statusbar"><div class="inner"></div></div>');		
			var stati = ['address','transactions'];

			for (var i in stati) {
				
				astatus.append(statusbar.clone().addClass(stati[i]));
				
			}
		
			return astatus;

		}
		
		
		getStatus() {
			return this.statusObject;
				
		}
			
		setStatus(name,value) {
			
			this.statusObject[name] = value;
		}
			
		checkPayment() {
			this.getTransactions(this.bufferPublicAddress).then((txids)=>{
				return this.checkTransactions(txids)}).then(
					results=>{
					txcount = results.length;
					
					function byBlocktime(a,b) {
					  if (a.blocktime < b.blocktime)
						return -1;
					  if (a.blocktime > b.blocktime)
						return 1;
					  return 0;
					}
					results.sort(byBlocktime);
					
					this.DGB.getWalletValue(this.bufferPublicAddress).then(walletval=>{
						
						// convert the balance to satoshis.
						var trec = walletval.totalReceivedSat;
						var balance = walletval.balanceSat;

						// check if the balance matches the specified amount;
						
						if(trec >= this.settings.amount+this.settings.fee) {
							
							// send the total wallet of the bufferaddress to the specified address;
							if(balance > 0) {
								this.finishPayment(results[0].vin[0].addr).then(result=>{
									this.setStatus('txs',results);
									if(trec > this.settings.amount+this.settings.fee) {
										var message = 'Payment overpaid, sending the overspend back to last used public key';
									} else {
										var message = 'Payment completed';
									}
									this.showStatus('transactions',message,'ready');
									this.success('Payment done');
								});
							} else {
								this.showStatus('transactions','Payment already paid','ready');
								this.setStatus('txs',results);
								// last tx is endtx. todo.
								this.setStatus('endTx',results[results.length-1]);
								this.success('Payment completed previously');
							}
						
							
						} else {
							// paid not enough
							var needed = this.settings.amount+this.settings.fee-trec;
								this.showStatus('transactions','Transaction underpaid by '+(needed),'pending');
							// first remake a new payment;	
								
								// recreate the QR
								this.createQr(	{'text':"digibyte:"+this.bufferPublicAddress+'?amount='+this.unit.fromSatoshis((needed)).toBTC(),
									'size':this.settings.size
									}
								)
								// reupdate the amount;

								// recheck the address for the amount
								this.checkPayment();	
						}
						
					},
					error=>{
						this.fail(error)}
					);

				},
				error=>{
					
					this.fail(error);
					
				}
			);


		}
		
		fail(message) {
			this.setStatus('message',message);
			this.setStatus('confirmed',false);
			this.showStatus('address',message,'failed');
			if(this.settings.onFail) {
				this.settings.onFail(this.getStatus());
			}
			
		}
		
		success(message) {
			this.setStatus('message',message);
			this.setStatus('confirmed',true);
			// show the status as ready and payment done
			// replace the QR with a checkmark.
			var checkimg = $('<img class="check" height="'+this.settings.size+'" width="'+this.settings.size+'" src="img/check.svg"/>').hide();
			this.main.find('.statusimage').html(checkimg);
			checkimg.fadeIn('slow');
			// if there is a callback for succes, execute it.
			if(this.settings.onSuccess) {
				this.settings.onSuccess(this.getStatus());
			}
			
			
		}
		
		showLoader() {
			
			if(this.main.find('.loader').length == 0) {
				var loader = $('<div style="width:'+this.settings.size+'px;height:'+this.settings.size+'px;" class="loader"></div>').hide();
				this.main.find('.statusimage').html(loader);
				loader.fadeIn('slow');
			}
		}
		
		getTransactions(address) {
			var url = 'https://digiexplorer.info/api/addr/'+address;
			var that = this;
			return new Promise((resolve, reject) => {
				checkExplorer(address);
				function checkExplorer(address) {
					$.getJSON( url,  (data) => {
						
						that.showStatus('address','Scan QR with DigiByte Payment App');
						that.showStatus('transactions','Checking address for transactions...');
						if(txcount === data.transactions.length) {
							setTimeout(checkExplorer,5000,address);
							
						} else {
							
							
							
							that.showLoader();
							that.showStatus('address','Transactions found on address','ready');
							resolve(data.transactions);
							
						}
					}).error(function(e) {
						reject('no valid json found');
					});
				}
			},error=>{
				reject(error);
			});
			
		}
	
		checkTransactions(txids) {
			var txs = [];
			var that = this;
			return new Promise((resolve, reject) => {

				var promises = [];
				// loop al TX and see if the confirmations are all in check				
				for(var i in txids) {
					promises.push(_checkTransaction(txids[i],this.settings.requiredConfirmations));
				}

				Promise.all(promises)
					.then(() => {
						resolve(txs);
					},
					error=>{reject(error)})
					.catch((e) => {
						reject(e);
					});
					
			});
				
			function _checkTransaction(tx,rc) {
					
					var url = 'https://digiexplorer.info/api/tx/'+tx;
					
					return new Promise((resolve, reject) => {
						
						function loopconfirm() {
							$.getJSON( url, function( data ) {
								// cast tot confirmations to an int
								var tc = parseInt(data.confirmations) || 0;
								if(tc >= rc ) {
									txs.push(data);
									resolve();
								} else {
									that.showStatus('transactions','Waiting for confirmations '+tc+'/'+rc+'pending');
									// lets wait for the average blocktiming devided by 2
									setTimeout(loopconfirm,(7500))
								}
									
							}).error(function(e) {
								reject('no valid json');
							});
						}
						loopconfirm();
					});

			}
		
		}
		showStatus(name,message,classname) {
			var el = this.main.find('.status .'+name+' .inner').html(message)
			
			
			if(classname) {
				el.addClass(classname);
			}
			
			if(this.settings.onStatusUpdate) {
				this.settings.onStatusUpdate({name,message,'flag':classname});
			}
		}
		
		fgp(parameterName) {
			var result = null,
				tmp = [];
			var items = location.search.substr(1).split("&");
			for (var index = 0; index < items.length; index++) {
				tmp = items[index].split("=");
				if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
			}
			return result;
		}
	
	
	
	
		finishPayment(address) {
			// send the total of the generated address to the selected address specified in the instatiation of the jquery payment element
			
			return new Promise((resolve, reject) => {
				this.DGB.getWalletValue(this.bufferPublicAddress).then(
					wval=>{
						
						// destinations are being made according to the amount that needs to be paid to the main address.
						var destinations = {};
						
						// fee is for the mainwallet
						destinations[this.settings.address] = (this.settings.amount);
						
						console.log(destinations);
					
						if(wval.balanceSat > this.settings.amount+this.settings.fee) {
							// spare money will be returned to the last sender.
							destinations[address]= (wval.balanceSat-(this.settings.amount+this.settings.fee));
							
						}
						// transaction is being created with the 2 addresses
						this.DGB.createTransaction(this.bufferPrivateKey, this.bufferPublicAddress, destinations,this.bufferPublicAddress,this.settings.fee,this.data).then(
							tx=>{
								console.log(tx);
								// send transaction, if it worked
								this.DGB.sendTransaction(tx).then(result=>{
										this.setStatus('endTx',result);
										resolve(result)
									},
									error=>{
										reject(error);
									}
								);
							},
							error=>{reject(error)}
						)
					
					
					},
					error=>{reject(error)}
				)
			});
			
		}
		
		

		
		
	};


		
	


	
	

	$.fn.digipay = function (options) {
		var settings = $.extend({}, $.fn.digipay.defaults, options);
		// these paramters are required
		console.log();
		var required = [];
		
		for(var i in required) {
			if(typeof settings[required[i]] === 'undefined') {
				 throw 'DigiPay requires '+required[i]+' for its initiation';
			}
		}

		// is it called correctly using an ID instead of a class.
		
		if(this.selector.indexOf('#') === -1) {
			throw('DigiPay can only be called with an ID, not a class or "naked" element');
		}
		
		// get result of validation;
		var res = $.fn.digipay.validate(settings)
		
		
		
		
		
		
		if(res.valid) {
			var dgp = new DigiPay(settings,$(this));
			
			
			$(this).append(dgp.getHtml());
			$(this).data('_digipay',dgp);
			return this;
			
		} else {
			
			for(var i in res.reason) {
				throw("\n"+res.reason.join("\n\n"))
			}

		}
		
		
		
		
		
	};
	
	$.fn.digipay.validate = function(settings) {
	
		
		
		
		
		var res = {
			valid:true,
			reason:[]
		};
		if(bytelength(settings.data) > 80) {
			res.reason.push('data setting is too large, it is supported up to 80 bytes, now it is:'+bytelength(settings.data)+'Bytes');
			res.valid = false;
		}
		
		if(settings.fee < 70000) {
			res.reason.push('Digiexplorer as of 23/3/2018 doesn\'t support fees lower than 70000 sat. if you want to ignore this run with setting.validate set to false');
			res.valid = false;
		}
		
		if(!digibyte.Address.isValid((settings.address))) {
			res.reason.push('"'+settings.address+'" is not a valid DigiByte address');
			res.valid = false;
		}
		
		
		
		return res;
		
		function bytelength(input) {
			return (new TextEncoder('utf-8').encode(input)).length
			
		}
	};
	
	$.fn.digipay.defaults = {
		// size of the QR, not the element. 
		size:300,
		
		
		
		// required confirmations of the network to accept the payment as legit. i set 3, but for small payments. 
		//it is best to do this at 6, but that takes long ( block timing is about 15 seconds )
		requiredConfirmations : 3,
		
		
		
		// Fucntion that is fired on the end of a successful payment
		onSuccess:false,
		
		
		
		// when the element is initialiazed, it returns a object with some properties that could be usefull.
		onInitialize:false,
		
		
		// this function is called when the transaction fails. In this case when the internet connection is lost.
		onFail:false,
		
		
		
		// this is the fee that is used to send the tx to digiexplorer.info to make sure the payment goes throgh, As of march 2018 it is required to have a minimum of 70000 sat.
		fee:70000,
		
		
		
		// this function will be called when the script updates is status during verification of the payment process.
		onStatusUpdate:false,
		
		
		
		// this parameter specifies if a validation of input needs to be done. It is highly recommended to leave this on true.
		validate:true
	};
	
	
	
})(jQuery);	






