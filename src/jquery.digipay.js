
(function($) {
	
	var DGB = new DGBO();
	var statusObject = {};
	var txcount = 0;
	var pvk;
	var unit = digibyte.Unit;
		
	function generatePaymentRequest(settings) {
	
		// check if a session is already in the address
		var data= fgp('data') || settings.data;

		var ppk = fgp('ppk');
		
		
		var qrimage = $('<img src="img/qr.png"/>');
		
		
		
		pvk = (ppk ? digibyte.PrivateKey.fromWIF(atob(ppk)) : new digibyte.PrivateKey());

		// create pvk WIFF address from the pvk.
		var bufferPrivateKey = pvk.toWIF().toString();
		var bufferPublicAddress = pvk.publicKey.toAddress().toString();
		
		// make savestate for if someone accidentaly presses F5
		history.pushState('', '', '?ppk='+btoa(bufferPrivateKey)+'&data='+data);
		
		
		/* Generate HT
		L */
		// main element
		var main = $('<div class="digiwrapper"><div style="height:'+(settings.size+40)+'px;" class="statusimage"></div> </div>'); 
		
		

		// add qr
		var qramount = unit.fromSatoshis(settings.amount+settings.fee).toBTC();
		
		
		qrimage.on('load',function() {
			createQr({
				'text':"digibyte:"+bufferPublicAddress+'?amount='+qramount,
				'size':settings.size,
	
			})
			
		});
		

		
		
		// add details of transaction
				
		var details = $('<div class="details"></div>');
		
		details.append('<div class="amount">Remaining '+unit.fromSatoshis(settings.amount).toBTC()+' DGB + ('+unit.fromSatoshis(settings.fee).toBTC()+'Fee)</div>');
		details.append('<div class="address">'+bufferPublicAddress+'</div>');
		details.append('<div class="txid">Txid:'+data+'</div>');
		main.append(details);
		
		// add status			

		main.append(
			createStatusbars()
		);		

		
		
		// check loop for payment check;
		checkPayment(bufferPublicAddress);
		
		if(settings.onInitialize) {
			// return a callback depending if it is set.
			settings.onInitialize({
				publicKey:bufferPublicAddress,
				privateKey:bufferPrivateKey,
			});
		}
		
		// Return the html element to be inserted using jquery
		
		return main;
	

		
	
		
		
		
		function createQr(qs) {
				// generate QR with qs settings
				
				qs.image = qrimage[0];
				qs.mode = 4
				qs.mSize = 0.30;
				qs.ecLevel = 'Q'
				return main.children('.statusimage').html($('<div class="qr"></div>').qrcode(qs).fadeIn('slow'));


		}
		
		function createStatusbars() {
			
			// create 2 status bars that update according to stage in transaction
			var astatus = $('<div class="status"></div>');			
			var statusbar = $('<div class="statusbar"><div class="inner"></div></div>');		
			var stati = ['address','transactions'];

			for (var i in stati) {
				
				astatus.append(statusbar.clone().addClass(stati[i]));
				
			}
		
			return astatus;

		}
		function getStatus() {
			return statusObject;
				
		}
			
		function setStatus(name,value) {
			
			statusObject[name] = value;
		}
			
		function checkPayment(address) {
			getTransactions(address).then((txids)=>{
				return checkTransactions(txids)}).then(
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
					
					DGB.getWalletValue(bufferPublicAddress).then(walletval=>{
						
						// convert the balance to satoshis.
						var trec = walletval.totalReceivedSat;
						var balance = walletval.balanceSat;

						// check if the balance matches the specified amount;
						
						if(trec >= settings.amount+settings.fee) {
							
							// send the total wallet of the bufferaddress to the specified address;
							if(balance > 0) {
								finishPayment(results[0].vin[0].addr).then(result=>{
									setStatus('txs',results);
									if(trec > settings.amount+settings.fee) {
										var message = 'Payment overpaid, sending the overspend back to last used public key';
									} else {
										var message = 'Payment completed';
									}
									showStatus('transactions',message,'ready');
									success('Payment done');
								});
							} else {
								showStatus('transactions','Payment already paid','ready');
								setStatus('txs',results);
								// last tx is endtx. todo.
								setStatus('endTx',results[results.length-1]);
								success('Payment completed previously');
							}
						
							
						} else {
							// paid not enough
							var needed = settings.amount+settings.fee-trec;
								showStatus('transactions','Transaction underpaid by '+(needed),'pending');
							// first remake a new payment;	
								
								// recreate the QR
								createQr(	{'text':"digibyte:"+bufferPublicAddress+'?amount='+unit.fromSatoshis((needed)).toBTC(),
									'size':settings.size
									}
								)
								// reupdate the amount;
								$(main).find('.amount').html('Remaining '+unit.fromSatoshis((needed)).toBTC()+' DGB');
								
								// recheck the address for the amount
								checkPayment(bufferPublicAddress);	
						}
						
					},
					error=>{
						fail(error)}
					);

				},
				error=>{
					console.log(error);
					fail(error);
					
				}
			);


		}
		
		function fail(message) {
			setStatus('message',message);
			setStatus('confirmed',false);
			showStatus('address',message,'failed');
			if(settings.onFail) {
				settings.onFail(getStatus());
			}
			
		}
		
		function success(message) {
			setStatus('message',message);
			setStatus('confirmed',true);
			// show the status as ready and payment done
			// replace the QR with a checkmark.
			var checkimg = $('<img class="check" height="'+settings.size+'" width="'+settings.size+'" src="img/check.svg"/>').hide();
			main.find('.statusimage').html(checkimg);
			checkimg.fadeIn('slow');
			// if there is a callback for succes, execute it.
			if(settings.onSuccess) {
				settings.onSuccess(getStatus());
			}
			
			
		}
		
		function showLoader() {
			
			if(main.find('.loader').length == 0) {
				var loader = $('<div style="width:'+settings.size+'px;height:'+settings.size+'px;" class="loader"></div>').hide();
				$(main).find('.statusimage').html(loader);
				loader.fadeIn('slow');
			}
		}
		
		function getTransactions(address) {
			var url = 'https://digiexplorer.info/api/addr/'+address;
			
			return new Promise((resolve, reject) => {
				checkExplorer(address);
				function checkExplorer(address) {
					$.getJSON( url, function( data ) {
						
						showStatus('address','Scan QR with DigiByte Payment App');
						showStatus('transactions','Checking address for transactions...');
						if(txcount === data.transactions.length) {
							setTimeout(checkExplorer,5000,address);
							
						} else {
							
							
							
							showLoader();
							showStatus('address','Transactions found on address','ready');
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
	
		function checkTransactions(txids) {
			var txs = [];
			return new Promise((resolve, reject) => {

				var promises = [];
				// loop al TX and see if the confirmations are all in check				
				for(var i in txids) {
					promises.push(_checkTransaction(txids[i]));
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
				
			function _checkTransaction(tx) {
					
					var url = 'https://digiexplorer.info/api/tx/'+tx;
					
					return new Promise((resolve, reject) => {
						
						function loopconfirm() {
							$.getJSON( url, function( data ) {
								// cast tot confirmations to an int
								var tc = parseInt(data.confirmations) || 0;
								if(tc >= settings.requiredConfirmations) {
									txs.push(data);
									resolve();
								} else {
									showStatus('transactions','Waiting for confirmations '+tc+'/'+settings.requiredConfirmations,'pending');
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
		function showStatus(name,message,classname) {
			var el = main.find('.status .'+name+' .inner').html(message)
			
			
			if(classname) {
				el.addClass(classname);
			}
			
			if(settings.onStatusUpdate) {
				settings.onStatusUpdate({name,message,'flag':classname});
			}
		}
		
		function fgp(parameterName) {
			var result = null,
				tmp = [];
			var items = location.search.substr(1).split("&");
			for (var index = 0; index < items.length; index++) {
				tmp = items[index].split("=");
				if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
			}
			return result;
		}
	
	
	
	
		function finishPayment(address) {
			// send the total of the generated address to the selected address specified in the instatiation of the jquery payment element
			
			return new Promise((resolve, reject) => {
				DGB.getWalletValue(bufferPublicAddress).then(
					wval=>{
						
						// destinations are being made according to the amount that needs to be paid to the main address.
						var destinations = {};
						
						// fee is for the mainwallet
						destinations[settings.address] = (settings.amount);
						
						console.log(destinations);
					
						if(wval.balanceSat > settings.amount+settings.fee) {
							// spare money will be returned to the last sender.
							destinations[address]= (wval.balanceSat-(settings.amount+settings.fee));
							
						}
						// transaction is being created with the 2 addresses
						DGB.createTransaction(bufferPrivateKey, bufferPublicAddress, destinations,bufferPublicAddress,settings.fee,data).then(
							tx=>{
								console.log(tx);
								// send transaction, if it worked
								DGB.sendTransaction(tx).then(result=>{
										setStatus('endTx',result);
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
		
		var required = ['address','amount'];
		for(var i in required) {
			if(typeof settings[required[i]] === 'undefined') {
				 throw 'digipay requires '+required[i]+' for its initiation';
			}
		}

		var res = $.fn.digipay.validate(settings)
		
		if(res.valid) {
			
			return $(this).append(generatePaymentRequest(settings));
			
		} else {
			
			for(var i in res.reason) {
				throw("\n"+res.reason.join("\n\n"))
			}
	
			
			
		}
		
		
		
		
		
	};
	
	$.fn.digipay.validate = function(settings) {
		console.log(bytelength(settings.data))
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
		
		size:300,
		requiredConfirmations : 3,
		onSuccess:false,
		onInitialize:false,
		onFail:false,
		fee:70000,
		onStatusUpdate:false,
		validate:true
	};
	
	
	
})(jQuery);	






