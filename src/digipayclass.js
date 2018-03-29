class DigiPay {
		
		
		constructor(settings,cont) {
			
			this.main = this.instanceHtml();
			// shadow copy of the settings, used in get settings()
			this.settings = {};
			this.unit = digibyte.Unit;
		
			this.setSettings(settings);
			
		
			// store the QR DGB logo image in the class.
			this.qrimage = $('<img src="img/qr.png"/>');
		
		}
		

		
		// SETTERS
		setSettings(settings) {
			function cfl(string) {
				return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
			}
			// fucntions arent alowed to be overwritten, except these
			var exceptions = ['onStatusUpdate','onSuccess','onFail','onInitialize'];
			$.each(settings, (i, c)=>{
				
				if(typeof this[i] == 'function' && !(i in exceptions)) {
					
					throw(i+' cant be set because it is a function, not a property');
				}
				
				if(typeof this['set'+cfl(i)] == 'function') {
					this['set'+cfl(i)](c);
				} else {
					this[i]=c;
				}
			 
			   
			   
			});
			
			this.settings = $.extend(this.settings,settings);
			
			
		}
	
		setData(data) {
			if(cb(data) >80) {
				throw('Data: "'+data+'" is too long, it can only be 80 bytes or less');
			} else {
				this.data = data;
			}
			function cb(s){
				var b = 0, i = 0, c
				for(;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
				return b
			}
			
		}
		
		setAmount(amount) {
			if(amount < 70000) {
				throw('Amount needs to be more than 70000, or it will be rejected in the digiexplorer API');
			} else {
				this.amount = amount;
			}
		}
		
		
		setAddress(address) {
			if(digibyte.Address.isValid(address)) {
				this.address = address;
			} else {
				throw('Address "'+address+'" is not a valid DigiByte public address');
			}
			
		}
	
	
		setTheme(theme) {
			var themes = ['light','dark'];
			$.each(themes, (i, c)=>{
			   this.main.removeClass(c);
			});

			this.main.addClass(theme);
		}
		

	
		setMode(mode) {
			
			this.mode = mode;
			
			
			
		}
		
		
		
		
		
		// GETTERS
		
		

		
		
		///// Functions
		
		newPayment(data,pvk) {
			
		
			for(var i in this.loops) {
				clearTimeout(this.loops[i]);
			}
			this.loops = {};
			// statusobject is being used to return when an eventhandler is being called
			this.statusObject = {};
			
			// data to be submitted in the blockchain is taken from the GET value 'data', or is taken from the settings object

			if(data) {
				this.setSettings({data});
				this.setStatus('data',data);
			} else {
				this.data = undefined;
			}
			
			
			
			// pvk is either set, or newly generated
			if(pvk) {
				this.pvk = digibyte.PrivateKey.fromWIF(pvk);
			} else {
				this.pvk = new digibyte.PrivateKey();
			}
			
			
			// txcount is being saved to make sure that during checkPayment not everytime all tx are being checked
			this.txcount = 0;
			
			// the DigiByte unit class to convert SAT to DGB
	
			// privatekey and public key pair buffer used to recieve the DigiByte to send to the eventual address specified
			this.bufferPrivateKey = this.pvk.toWIF().toString();
			this.bufferPublicAddress = this.pvk.publicKey.toAddress().toString();
			
			// save it to the status object
			this.setStatus('publicKey',this.bufferPublicAddress)
			this.setStatus('privateKey',this.bufferPrivateKey)
	
			
			
			
			//  save the data to the GET properties in the url, needs to be cleaner
		
			
			this.checkPayment();
			this.getPaymentHtml();
			
		}
		
		
		
		getPaymentHtml() {

			/* Generate HT
			L */
			// main element
			var details = this.main.find('.statusimage').css({'height':(this.size+40)+'px'});

			// add qr
			var qramount = this.unit.fromSatoshis(this.amount+this.fee).toBTC();
			
			

			this.createQr({
					'text':"digibyte:"+this.bufferPublicAddress+'?amount='+qramount,
					'size':this.size,
		
				})
			// add details of transaction
					
			var details = this.main.find('.details').empty();
			
			details.append('<div class="amount">To pay '+this.unit.fromSatoshis(this.amount).toBTC()+' DGB + ('+this.unit.fromSatoshis(this.fee).toBTC()+'Fee)</div>');
			details.append('<div class="address">'+this.bufferPublicAddress+'</div>');
			details.append('<div class="txid">Txid:'+this.data+'</div>');
			
			this.main.append(details);
			
			// add status			

			this.main.append(
				this.createStatusbars()
			);		

			
		
			if(this.onInitialize) {
				// return a callback depending if it is set.
				this.onInitialize(this.getStatus());
			}
			
			// Return the html element to be inserted using jquery
			
			return this.main;
		
		}
		

		
		instanceHtml() {
			
			
			var main = $('<div class="digiwrapper"><div class="statusimage"></div><div class="details"></div><div class="status"></div></div>');
			
			return main;
			
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
			var astatus = this.main.find('.status').empty();
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
					this.txcount = results.length;
					
					function byBlocktime(a,b) {
					  if (a.blocktime < b.blocktime)
						return -1;
					  if (a.blocktime > b.blocktime)
						return 1;
					  return 0;
					}
					results.sort(byBlocktime);
					
					DGBO.getWalletValue(this.bufferPublicAddress).then(walletval=>{
						
						// convert the balance to satoshis.
						var trec = walletval.totalReceivedSat;
						var balance = walletval.balanceSat;

						// check if the balance matches the specified amount;
						
						if(trec >= this.amount+this.fee) {
							
							// send the total wallet of the bufferaddress to the specified address;
							if(balance > 0) {
								this.finishPayment(results[0].vin[0].addr).then(result=>{
									this.setStatus('txs',results);
									if(trec > this.amount+this.fee) {
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
							var needed = this.amount+this.fee-trec;
								this.showStatus('transactions','Transaction underpaid by '+(needed),'pending');
							// first remake a new payment;	
								
								// recreate the QR
								this.createQr(	{'text':"digibyte:"+this.bufferPublicAddress+'?amount='+this.unit.fromSatoshis((needed)).toBTC(),
									'size':this.size
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
			if(this.onFail) {
				this.onFail(this.getStatus());
			}
			
		}
		
		success(message) {
			this.setStatus('message',message);
			this.setStatus('confirmed',true);
			// show the status as ready and payment done
			// replace the QR with a checkmark.
			var checkimg = $('<img class="check" height="'+this.size+'" width="'+this.size+'" src="img/check.svg"/>').hide();
			this.main.find('.statusimage').html(checkimg);
			checkimg.fadeIn('slow');
			// if there is a callback for succes, execute it.
			if(this.onSuccess) {
				this.onSuccess(this.getStatus());
			}
			
			
		}
		
		showLoader() {
			
			if(this.main.find('.loader').length == 0) {
				var loader = $('<div style="width:'+this.size+'px;height:'+this.size+'px;" class="loader"></div>').hide();
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
						if(that.txcount === data.transactions.length) {
							that.loops.getTx = setTimeout(checkExplorer,5000,address);
							
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
					promises.push(_checkTransaction(txids[i],this.requiredConfirmations));
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
									that.loops.confirm = setTimeout(loopconfirm,(7500));
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
			
			if(this.onStatusUpdate) {
				this.onStatusUpdate({name,message,'flag':classname});
			}
		}
		
		
	
	
	
		finishPayment(address) {
			// send the total of the generated address to the selected address specified in the instatiation of the jquery payment element
			
			return new Promise((resolve, reject) => {
				DGBO.getWalletValue(this.bufferPublicAddress).then(
					wval=>{
						
						// destinations are being made according to the amount that needs to be paid to the main address.
						var destinations = {};
						
						// fee is for the mainwallet
						destinations[this.address] = (this.amount);
							
						if(wval.balanceSat > this.amount+this.fee) {
							// spare money will be returned to the last sender.
							destinations[address]= (wval.balanceSat-(this.amount+this.fee));
							
						}
						// transaction is being created with the 2 addresses
						DGBO.createTransaction(this.bufferPrivateKey, this.bufferPublicAddress, destinations,this.bufferPublicAddress,this.fee,this.data).then(
							tx=>{
							
								// send transaction, if it worked
								DGBO.sendTransaction(tx).then(result=>{
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

	
