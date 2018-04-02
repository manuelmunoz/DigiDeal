class DigiPay {
		
		
		constructor(settings,cont) {
			this.container = cont;
			// create HTML for everything
			this.foundation = 'DFVsFBiKuaL5HM9NWZgdHTQecLNit6tX5Y';
			this.instanceHtml();
			this.statusObject = {};
			
			this.remainingAmount = 0;

			this.settings = {};
			
			// event listeners for online
			
			window.addEventListener('online',this.online);
			
			window.addEventListener('offline',this.offline);
		
			this.isOnline = navigator.onLine;
		
			
			// shadow copy of the settings, used in get settings()
			
			this.unit = digibyte.Unit;
			
			this.setSettings(settings);
			// store the QR DGB logo image in the class.
			this.qrimage = $('<img src="img/qr.png"/>');
		
		}
		
		destroy() {
			this.container.removeData('_digipay')
			this.main.remove();
			for(var i in this.loops) {
				clearTimeout(this.loops[i]);
			}
			
		}
		
		
		online() {
			this.isOnline = true;
			console.log('payment system is online');
			return this;
		}
		
		offline() {
			this.isOnline = false;
			console.log('payment system is offline');
			return this;
		}
		
		// SETTERS
		setSettings(settings) {
			function cfl(string) {
				return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
			}
			// functions arent alowed to be overwritten, except these
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
			return this;
			
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
			return this;
		}
		
		setAmount(amount) {
			if(amount < 70000) {
				throw('Amount needs to be more than 70000, or it will be rejected in the digiexplorer API');
			} else {
				this.amount = amount;
				
			}
			return this;
		}
		
		
		setAddress(address) {
			if(digibyte.Address.isValid(address)) {
				this.address = address;
			} else {
				throw('Address "'+address+'" is not a valid DigiByte public address');
			}
			return this;
			
		}
	
	
		setTheme(theme) {
			var themes = ['light','dark'];
			$.each(themes, (i, c)=>{
			   this.main.removeClass(c);
			});

			this.main.addClass(theme);
			return this;
		}
		

	
		setMode(mode) {
			
			// mode can be express and advanced
			this.mode = mode;
			return this;
		}
		
		
		
		
		getStatus() {
			return this.statusObject;
				
		}
			
		setStatus(name,value) {
			if(typeof value == 'undefined') {
				this.statusObject = name;
			} else {
				this.statusObject[name] = value;
			}
			return this;
		}
		
		
		// GETTERS
		
		

		
		
		///// Functions
		
		
		resize() {
			var element = this.container[0]
			var cs = getComputedStyle(element);
			var paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
			var borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
			// Element width and height minus padding and border
			 var elementWidth = element.offsetWidth - paddingX - borderX;
			this.container.find('.digiwrapper').css('width',elementWidth);
			
			this.size = elementWidth-100;
			// the +60 part is 100 - 60 the 20 px padding on the wrapper
			var details = this.main.find('.statusimage').css({'height':(this.size+60)+'px'});
	
			// add qr
			
			this.genStatus() 
			return this;
		
		}
		
		
		genStatus() {
			
			
			switch(this.getStatus().status) {
				
				case 'checking':
					this.createQr();
					break;
				case 'busy':
					this.showLoader();
					break;
				case 'done':
					var checkimg = $('<img class="check" height="100%" width="100%" src="img/check.svg"/>').hide();
					this.main.find('.statusimage').html(checkimg);
					checkimg.fadeIn('slow');
					break;
				default: 
					this.createQr();
					break;
				
				
			}
			return this;
		}
		
		
		getFoundationamount() {
			if(this.coulance) {
				var foundation = this.amount*0.01 > 70000 ? parseInt(this.amount*0.01):70000;
			} else {
				var foundation = 0;
			}
			// 10 dgb is max
			if(foundation > 10000000) {
				foundation = 10000000;
			}
			
			return foundation
			
		}
		
		newPayment(data,pvk) {
			

			this.remainingAmount = this.amount+this.fee+this.getFoundationamount();
			
			
			this.firstpayer = undefined;
			for(var i in this.loops) {
				clearTimeout(this.loops[i]);
			}
			this.loops = {};
			// statusobject is being used to return when an eventhandler is being called
			this.statusObject = {};
			this.setStatus('status','checking');
			// data to be submitted in the blockchain is taken from the GET value 'data', or is taken from the settings object

			if(data) {
				this.setSettings({data})
					.setStatus('data',data);
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
				.setStatus('privateKey',this.bufferPrivateKey)
	
			
			
			
			//  save the data to the GET properties in the url, needs to be cleaner
		
			
			this.checkPayment()
				.genPaymentHtml();
			return this;
		}
		
		
		
		genPaymentHtml() {
	
			/* Generate HT
			L */
			// main element
			
		

			// add details of transaction
					
			var details = this.main.find('.details').empty();
			
			
			details.html('<div class="amount"></div><div class="address"></div>');
			
			
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
			this.resize();
			return this;
		
		}
		

		
		instanceHtml() {
			
			
			this.main = $('<div class="digiwrapper"><div class="statusimage"></div><div class="details"></div><div class="status"></div></div>');
			
			return this;
			
		}
		
		
		
		
		
		
		
		
		createQr() {
				
				
				
				// generate QR with qs settings
				$(this.main).find('.qr').remove();
				var qs = {};
				
				qs.text = "digibyte:"+this.bufferPublicAddress+'?amount='+this.unit.fromSatoshis(this.remainingAmount).toBTC();
				qs.size = this.size;
				qs.image = this.qrimage[0];
				qs.mode = 4
				qs.mSize = 0.30;
				qs.ecLevel = 'Q'

				if(this.qrimage[0].naturalWidth !== 0 && this.qrimage[0].complete) {
					
					this.main.find('.statusimage').html($('<div class="qr"></div>').qrcode(qs).fadeIn('slow'));
				} else {
					this.qrimage.on('load',()=>{
						this.main.find('.statusimage').html($('<div class="qr"></div>').qrcode(qs).fadeIn('slow'));
					});

				} 
				
				$(this.main).find('.details .amount').html(this.unit.fromSatoshis(this.remainingAmount).toBTC());
				$(this.main).find('.details .address').html(this.bufferPublicAddress);
				return this;
		}
		
		createStatusbars() {
			
			// create 2 status bars that update according to stage in transaction
			var astatus = this.main.find('.status').empty();
			var statusbar = $('<div class="statusbar"><div class="inner"></div></div>');		
			var stati = ['address','transactions'];

			for (var i in stati) {
				
				astatus.append(statusbar.clone().addClass(stati[i]));
				
			}
			
			return this;

		}
		
			
			
			
			
			
			
		checkPayment() {
			
			this.getTransactions(this.bufferPublicAddress).then((txids)=>{
				
				return this.checkTransactions(txids)}).then(
					results=>{
					this.firstpayer = results[0].vin[0].addr;
					this.txcount = results.length;
					
					function byBlocktime(a,b) {
					  if (parseInt(a.blocktime) < parseInt(b.blocktime))
						return -1;
					  if (parseInt(a.blocktime) > parseInt(b.blocktime))
						return 1;
					  return 0;
					}
					results.sort(byBlocktime);
					
					DGBO.getWalletValue(this.bufferPublicAddress).then(walletval=>{
						
						// convert the balance to satoshis.
						var trec = walletval.totalReceivedSat;
						var balance = walletval.balanceSat;

						// check if the balance matches the specified amount;
						
						
						if(this.verifyEnd(results)) {
							
							// done already
							if(balance > 0 ) {
								this.abort();
							} 
							
							// still needs a check if there are funds remaining maybe after double spend and auto reimburse
							this.showStatus('transactions','Payment already paid','ready');
							this.setStatus('txs',results);
							// last tx is endtx. todo.
							this.setStatus('endTx',results[results.length-1]);
							this.success('Payment completed previously');

							
						} else {
						
							// not yet done.
							if(balance >= this.amount+this.fee+this.getFoundationamount()) {
								// enough
								// send the total wallet of the bufferaddress to the specified address;
							
								this.finishPayment(this.firstpayer).then(result=>{
									this.setStatus('txs',results);
									if(balance > this.amount+this.fee+this.getFoundationamount()) {
										var message = 'Payment overpaid, sending the overspend back to last used public key';
									} else {
										var message = 'Payment completed';
									}
									
									this.setStatus('status','done');
									
									this.showStatus('transactions',message,'ready');
									this.success('Payment done');
								});
							
								
							} else {
								// balance is not enough
								
								// check if there is a payment with the required amount
								// TODO
															
									var needed = this.amount+this.fee+this.getFoundationamount()-balance;
									console.log(walletval)
								// first remake a new payment;	
									this.remainingAmount = needed;
				
									this.showStatus('transactions','Transaction underpaid by '+(this.remainingAmount),'pending');
									// recreate the QR
									
									this.createQr();
									// reupdate the amount;
									// recheck the address for the amount 
									this.checkPayment();	
							}
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
			return this;

		}
		
		fail(message) {
			this.setStatus('message',message)
				.setStatus('confirmed',false)
				.showStatus('address',message,'failed');
			if(this.onFail) {
				this.onFail(this.getStatus());
			}
			return this;
		}
		
		
		verifyEnd(txs) {
			
			for(var i in txs) {
				
				let tx = txs[i];
				for(var j in tx.vout) {
					let vout = tx.vout[j];
					console.log(vout);
					if(vout.scriptPubKey.addresses[0] === this.address && this.unit.fromBTC(vout.value).toSatoshis() === this.amount) {
						
						return true;
					}
				}
				console.log(tx);
				
				
			}
			
			return false;
		}
		
		success(message) {
			this.setStatus('message',message)
				.setStatus('confirmed',true)
			// show the status as ready and payment done
			// replace the QR with a checkmark.

				.showStatus('address','<a target="_BLANK" href="'+DGBO.explorerUrl+'/tx/'+this.getStatus().endTx.txid+'">See TX on Blockchain</a>','success')
				.setStatus('status','done')
				.genStatus();
			
			// if there is a callback for succes, execute it.
			if(this.onSuccess) {
				this.onSuccess(this.getStatus());
			}
			
			return this;
		}
		
		showLoader() {
			
			if(this.main.find('.loader').length == 0) {
				var loader = $('<div style="width:100%;height:100%" class="loader"></div>').hide();
				this.main.find('.statusimage').html(loader);
				loader.fadeIn('slow');
			}
			return this;
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
							// if there are the same number of TX as last time dont even bother checking
							that.loops.getTx = setTimeout(checkExplorer,5000,address);
							
						} else {

							that.showStatus('address','Transactions found on address','ready');
							that.setStatus('status','busy');
							that.genStatus();
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
			return this;
		}
		
		abort() {
			return new Promise((resolve, reject) => {
				DGBO.getWalletValue(this.bufferPublicAddress).then(
					wval=>{
						
						// destinations are being made according to the amount that needs to be paid to the main address.
						var destinations = {};
						
						// fee is for the mainwallet
						destinations[this.firstpayer] = wval.balanceSat-this.fee;
						
						// transaction is being created with the 2 addresses
						DGBO.createTransaction(this.bufferPrivateKey, this.bufferPublicAddress, destinations,this.bufferPublicAddress,this.fee).then(
							tx=>{
								console.log(tx);
								// send transaction, if it worked
								DGBO.sendTransaction(tx).then(result=>{
										
										resolve(result);
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
	
	
	
		finishPayment() {
			// send the total of the generated address to the selected address specified in the instatiation of the jquery payment element
			
			return new Promise((resolve, reject) => {
				DGBO.getWalletValue(this.bufferPublicAddress).then(
					wval=>{
						
						// destinations are being made according to the amount that needs to be paid to the main address.
						var destinations = {};
						
						// fee is for the mainwallet
						destinations[this.address] = (this.amount);
							
						if(wval.balanceSat > this.amount+this.fee+this.getFoundationamount()) {
							
							// spare money will be returned to the last sender.
							destinations[this.firstpayer]= (wval.balanceSat-(this.amount+this.fee+this.getFoundationamount()));
							
						}
						
						if(this.getFoundationamount()) {
							
							destinations[this.foundation] = this.getFoundationamount();
						}
						
						// transaction is being created with the 2 addresses
						DGBO.createTransaction(this.bufferPrivateKey, this.bufferPublicAddress, destinations,this.bufferPublicAddress,this.fee,this.data).then(
							tx=>{
								console.log(tx);
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

	
