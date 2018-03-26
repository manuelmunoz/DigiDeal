
class DGBO {
		
		


		
		static getMarketValue() {
			return new Promise((resolve, reject) => {
				$.getJSON(DGBO.marketUrl, function( data ) {
					resolve(data[0]);
				}).error(function(e){
					reject('price not found');
				});
			});
		}
		
		static getUTXO(address) {
			var url = DGBO.explorerUrl+'/api/addr/'+address+'/utxo';

			return new Promise((resolve, reject) => {
				
				$.getJSON( url, function( data ) {
					resolve(data);
				}).error(function(e) {
					reject('no valid json');
				});

			});

		}
		
		static getWalletValue(address) {
			return new Promise((resolve, reject) => {
				$.getJSON( DGBO.explorerUrl + "/api/addr/" + address, (data) => {
					
					resolve(data);
				}).error(function() {
					
					reject('no json in wallet value');

				});
			});
		}
		
		
		
		
		static sendAll(sourcePrivateKey,destinationAddress) {
			return new Promise((resolve, reject) => {
				var sourceAddress = sourcePrivateKey.publicKey.toAddress().toString();
				
				DGBO.getWalletValue(sourceAddress).then(value=>{
					resolve(value);
					
				});
				
			})
		}
		
		
	
		static createTransaction(sourcePrivateKey, sourceAddress, destinations, changeAddress,fee,data) {
			// destinations object has this structure
			// eg. {
			//			"DSDgxyw9KqxPRD44S1kaUvRRZyFVrPP1QF":1000,
			//			"DSgr2JVuArg7Aw3v9D6nE8i9zupriBPo3a":5000
			//		}
			data = data || false;
			changeAddress = changeAddress || sourceAddress;
			return new Promise((resolve, reject) => {
				DGBO.getUTXO(sourceAddress).then(utxos => {
					
					if(utxos.length == 0) {
						reject("The source address has no unspent transactions");
					}
					var transaction = new digibyte.Transaction();
					
					
					for(var i = 0; i < utxos.length; i++) {
						transaction.from(utxos[i]);
					}
					
					for(var da in destinations) {	
						transaction.to(da, destinations[da]);
					}

					if(fee) {
						transaction.fee(fee);
					}
					
					transaction.change(changeAddress);

					if(data) {
						transaction.addData(data);
					}
					
					transaction.sign(sourcePrivateKey);
					
					resolve(transaction);
				}, error => {
					
					reject(error);
				});
			});
		}
		
		
		
		static getDataFile(address) {
			
			return new Promise((resolve, reject) => {
				
				DGBO.getWalletValue(address).then(result=>{

					DGBO.checkTransactions(result.transactions).then(result=>{
						var txs = [];
						for(var i in result) {
							
							if(result[i].vin[0].addr == address) {
								var vout = result[i].vout;
								for(var j in vout) {

									if(vout[j].spentTxId) {
										txs.push(vout[j].spentTxId);
									}
								}
							}

						}					
						DGBO.checkTransactions(txs).then(result=>{
							var filearray = [];
					
							for(var i in result) {
								var data = OPfromtx(result[i])

								if(data) {
									var [index,val] = data.split(':');
									filearray[index] = val;
								}
							}
							resolve((filearray.join('')));
						},
						error=>{
							reject(error);
						});
					},
					error=>{
						reject(error);
					});

				},
				error=>{
					reject(error);
				});
				
			})
			function OPfromtx(tx) {
				var data = (tx.vout[tx.vout.length-1].scriptPubKey.asm) || false;
				if(data && data.substr(0,9) == 'OP_RETURN') {
					
					return hex2a(data.substr(10));
				} else {
					return false;
				}
				
			}
			function hex2a(hexx) {
				var hex = hexx.toString();//force conversion
				var str = '';
				for (var i = 0; i < hex.length; i += 2)
					str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
				return str;
			}
			
		}
		
		
		
		static getTxData(txid) {
			var url = this.explorerUrl+'/api/tx/'+txid;
			
			return new Promise((resolve, reject) => {

				$.getJSON( url, function( data ) {

					resolve(data);

				}).error(function(e) {
					reject('no valid json found in TX'+e);
				});

			});
			
			
		}
		
		static getOpData(tx) {
			
			return new Promise((resolve, reject) => {
				if(typeof tx !== 'Object') {
					this.getTxData(tx).then(result=>{
						var res = OPfromtx(result)
						if(res) {
							resolve(res)
						} else {
							reject('no OP data found in transaction');
						}

					});
				} else {
					var res = OPfromtx(tx);
					if(res) {
						resolve(res)
					} else {
						reject('no OP data found in transaction');
					}
					
				}
			})
			
			function OPfromtx(tx) {
				var data = (tx.vout[tx.vout.length-1].scriptPubKey.asm) || false;
				if(data && data.substr(0,9) == 'OP_RETURN') {
					
					return hex2a(data.substr(10));
				} else {
					return false;
				}
				
			}
			function hex2a(hexx) {
				var hex = hexx.toString();//force conversion
				var str = '';
				for (var i = 0; i < hex.length; i += 2)
					str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
				return str;
			}
		}
		
		
		static checkTransactions(txids) {
			var txs = [];
			return new Promise((resolve, reject) => {
			
				var promises = [];
				// loop al TX and see if the confirmations are all in check				
				for(var i in txids) {
					promises.push(_checkTransaction(txids[i],1));
				}
				
				Promise.all(promises)
					.then(() => {
						
						resolve(txs);
					})
					.catch((e) => {
						reject(e);
					});
					
			});
				
			function _checkTransaction(tx,n) {
		
				var url = DGBO.explorerUrl+'/api/tx/'+tx;

				return new Promise((resolve, reject) => {
					
					function loopconfirm() {
						$.getJSON( url, function( data ) {
							// cast tot confirmations to an int
							
							var tc = parseInt(data.confirmations) || 0;
							if(tc >= n) {
								txs.push(data);
								resolve();
							} else {
								// lets wait for the average blocktiming devided by 2
								setTimeout(loopconfirm,(7500))
							}
								
						}).error(function(e) {
							reject('No valid JSON in Transaction found:'+e);
						});
					}
					loopconfirm();
				});

			}
		
		}
		static checkTransaction(tx,n) {
		
			var url = DGBO.explorerUrl+'/api/tx/'+tx;

			return new Promise((resolve, reject) => {
				
				function loopconfirm() {
					$.getJSON( url, function( data ) {
						// cast tot confirmations to an int
						
						var tc = parseInt(data.confirmations) || 0;
					
						if(tc >= n) {
							
							resolve(data);
						} else {
							// lets wait for the average blocktiming devided by 2
							setTimeout(loopconfirm,(7500))
						}
							
					}).error(function(e) {
						reject('No valid JSON in Transaction found:'+e);
					});
				}
				loopconfirm();
			});

		}
		
		
		static sendTransaction(transaction) {

			 return new Promise((resolve, reject) => {
				$.ajax({
					type: "POST",
					//the url where you want to sent the userName and password to
					url: 'https://digiexplorer.info/api/tx/send/',
					crossDomain: true,
					contentType: 'application/json',
					//json object to sent to the authentication url
					data: JSON.stringify({
						"rawtx": transaction.serialize()
					}),
					success: function (data) {
						resolve(data);
					},
					error: function(xhr, status, error) {
						reject(error);
					}
					
				})
				
			 });
		}
		
	}
	
	DGBO.explorerUrl = "https://digiexplorer.info";
	DGBO.marketUrl = "https://api.coinmarketcap.com/v1/ticker/digibyte/";


			