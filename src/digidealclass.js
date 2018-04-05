class DigiDeal {
		
		
		constructor(settings,cont) {
			this.container = cont;
			this.main = $('<div class="digiwrapper"><div class="statusimage"></div><div class="details"></div></div>');
			// create HTML for everything
			this.foundation = 'DFVsFBiKuaL5HM9NWZgdHTQecLNit6tX5Y';
			this.statusObject = {};
			this.remainingAmount = 0;
		
			this.setStatus('status','waiting');
			
			this.settings = {};
			// event listeners for online
	
			window.addEventListener('online',this.online);
			
			window.addEventListener('offline',this.offline);
		
			this.isOnline = navigator.onLine;
			
			// shadow copy of the settings, used in get settings()
			
			this.unit = digibyte.Unit;
			
			this.setSettings(settings);
			this.showDetails('Awaiting payment input');
									
			// store the QR DGB logo image in the class.
			this.qrimage = $('<img src="img/qr.png"/>');
			this.resize();
		}
		
		destroy() {
			this.container.removeData('_DigiDeal');
			window.removeEventListener('online',this.online);
			window.removeEventListener('offline',this.offline);
			this.main.remove();
			this.clearTimeouts();
			return this;
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
			var exceptions = ['onStatusUpdate','onSuccess','onFail','onInitialize','onNewPayment'];
			
			$.each(settings, (i, c)=>{
				if(typeof this[i] == 'function' && !(i in exceptions)) {
					return this.fail(i+' cant be set because this function is protected');
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
				return this.fail('Data: "'+data+'" is too long, it can only be 80 bytes or less');
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
			amount = parseInt(amount);
			if(amount < 70000) {
				return this.fail('Amount needs to be more than 70000, or it will be rejected in the digiexplorer API');
			} else {
				this.amount = amount;
				
			}
			
			return this;
		}
		
		
		setAddress(address) {
			if(digibyte.Address.isValid(address)) {
				this.address = address;
			} else {
				return this.fail('Address "'+address+'" is not a valid DigiByte public address');
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

		

		

		

		
		
		
		
		
		
		
		
		

		
		getFoundationAmount() {
			if(this.coulance) {
				var foundation = this.amount*0.01 > 70000 ? parseInt(this.amount*0.01):70000;
			} else {
				var foundation = 0;
			}
			// 10 dgb is max
			if(foundation > 10000000) {
				foundation = 10000000;
			}
			
			return foundation;
			
		}
		
		newPayment(data,pvk) {
			
		
			
			this.firstpayer = undefined;
			this.clearTimeouts();
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
				.setStatus('address',this.address)
				.setStatus('amount',this.amount);
			
			
			
			this.remainingAmount = this.amount+this.fee+this.getFoundationAmount();
			this.setStatus('remaining',this.remainingAmount);
			//  save the data to the GET properties in the url, needs to be cleaner
		
			if(this.onNewPayment) {
				this.onNewPayment(this.getStatus());
			}
			
			this.showDetails('<div>Reading address for transactions</div>');
			
			this.checkPayment()
			this.updateStatus() 
			return this;
		}
		
		clearTimeouts() {
			for(var i in this.loops) {
				clearTimeout(this.loops[i]);
			}
			return this;
		}
		
		
		showDetails(message) {
			
			$(this.main).find('.details').html(message);
			return this;
		}	
		
				
		///// HTML related Functions
		// statusshowers
		updateStatus() {
			
			
			switch(this.getStatus().status) {
				case 'waiting':
		
					this.showWait()
					break;
				case 'checking':
					this.createQr();
					break;
				case 'busy':
					this.showLoader();
					break;
				case 'failed':
					this.showFail();
					break;
				case 'done':
					this.showDone();
					break;
				default: 
					//this.createQr();
					break;
				
				
			}
			return this;
		}
		
		showWait() {
			this.showLoader();
		}
	
		showLoader() {
			var width,height;
			width = height = this.size+10+'px';
			
			if(this.main.find('.loader').length == 0) {
				var loader = $('<div style="width:'+width+';height:'+height+'" class="loader"></div>').hide();
				this.main.find('.statusimage').html(loader);
				loader.fadeIn('slow');
			}else {
				this.main.find('.loader').css({width,height});
			}
			return this;
		}
		
		showFail() {
			var width,height;
			width = height = this.size+10+'px';
			
			if(!(this.main.find('.fail').length > 0)) {
				
				var checkimg = $('<img class="fail" style="width:'+width+';height:'+height+'" src="img/fail.png"/>').hide();
				this.main.find('.statusimage').html(checkimg);
				checkimg.fadeIn('slow');
			} else {
				this.main.find('.fail').css({width,height});
			}
			
		}
		
		showDone() {
			var width,height;
			width = height = this.size+10+'px';
			
			if(!(this.main.find('.check').length > 0)) {
				var checkimg = $('<img class="check" style="width:'+width+';height:'+height+'" src="img/check.svg"/>').hide();
				this.main.find('.statusimage').html(checkimg);
				checkimg.fadeIn('slow');
			}else {
				this.main.find('.check').css({width,height});
			}
			
			
		}
		
		
		
		
		
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
			var details = this.main.find('.statusimage').css({'height':(this.size+14)+'px'});
	
			// add qr
			
			this.updateStatus() 
			return this;
		
		}
		


		
		createQr() {
				
				
				
				// generate QR with qs settings
				$(this.main).find('.qr').remove();
				var qs = {};
				
				qs.text = "digibyte:"+this.bufferPublicAddress+'?amount='+this.unit.fromSatoshis(this.remainingAmount).toBTC();
				qs.size = this.size-10;
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

							this.setStatus('txs',results);
							// last tx is endtx. todo.
							this.setStatus('endTx',results[results.length-1]);
							this.showDetails('Payment is done previously')
							this.success(this.getStatus());
							
							
						} else {
						
							// not yet done per se
							if(balance >= this.amount+this.fee+this.getFoundationAmount()) {
								// enough
								// send the total wallet of the bufferaddress to the specified address;
							
								this.finishPayment(this.firstpayer).then(result=>{
									this.setStatus('txs',results);
									if(balance > this.amount+this.fee+this.getFoundationAmount()) {
										var message = 'Payment overpaid, sending the overspend back to last used public key';
									} else {
										var message = 'Payment completed';
									}
									
									this.setStatus('status','done');
									this.setStatus('remaining',0);
									this.remainingAmount = 0;
									this.showDetails('Payment done');
									this.success('Payment done');
								});
							
								
							} else {
								// balance is not enough
								
								// check if there is a payment with the required amount
								// TODO
																		
									var needed = this.amount+this.fee+this.getFoundationAmount()-balance;
								// first remake a new payment;	
									this.remainingAmount = needed;
									this.setStatus('remaining',needed);
									// recreate the QR
									this.showDetails('Payment is underpaid, it still needs '+this.unit.fromSatoshis(needed).toBTC()+'DigiByte');
									this.createQr();
									// reupdate the amount;
									// recheck the address for the amount 
									this.checkPayment();	
							}
						}
						
					},
					error=>{
						return this.fail(error)}
					);

				},
				error=>{
					
					return this.fail(error);
					
				}
			);
			return this;

		}
		
		fail(message) {
			this.setStatus('message',message)
				.setStatus('confirmed',false)
				.setStatus('status','failed')
				.showDetails(message)
				.clearTimeouts()
				.updateStatus();
				
				
			if(this.onFail) {
				this.onFail(this.getStatus());
			}
		
			throw('error'+message);
			return this;
		}
		
		
		verifyEnd(txs) {
			
			for(var i in txs) {
				
				let tx = txs[i];

				for(var j in tx.vout) {
					let vout = tx.vout[j];

					if(typeof vout.scriptPubKey.addresses !== 'undefined' && vout.scriptPubKey.addresses[0] === this.address && this.unit.fromBTC(vout.value).toSatoshis() >= this.amount) {
	
						return true;
					}
				}
			}
			
			return false;
		}
		
		success(message) {
			this.setStatus('message',message)
				.setStatus('confirmed',true)
			// show the status as ready and payment done
			// replace the QR with a checkmark.
	
				.setStatus('status','done')
				.updateStatus();
			
			// if there is a callback for succes, execute it.
			if(this.onSuccess) {
				this.onSuccess(this.getStatus());
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

						if(that.txcount === data.transactions.length) {
							// if there are the same number of TX as last time dont even bother checking
							that.loops.getTx = setTimeout(checkExplorer,5000,address);
							
						} else {


							that.setStatus('status','busy');
							that.updateStatus();
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
									that.showDetails('awaiting confirmations '+tc+'/'+rc);
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

		abort() {
			this.clearTimeouts();
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
							
						if(wval.balanceSat > this.amount+this.fee+this.getFoundationAmount()) {
							
							// spare money will be returned to the last sender.
							destinations[this.firstpayer]= (wval.balanceSat-(this.amount+this.fee+this.getFoundationAmount()));
							
						}
						
						if(this.getFoundationAmount()) {
							if(typeof destinations[this.foundation] !== 'undefined') {
								destinations[this.foundation]+=this.getFoundationAmount();	
							} else {
								destinations[this.foundation]=this.getFoundationAmount();
							}
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

	
