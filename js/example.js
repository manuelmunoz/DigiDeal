	
		
		
			
	
			var success = function (e) {
				console.log('succes',e);
				
				DGBO.getOpData(e.endTx.txid).then(result=>{console.log(result)});
			}
			var failed = function(e) {
				console.log('fail',e);
				
			}
			
			
			var newpay = function(e) {
				// fires after a payment is generated
				console.log(e);
				// this makes sure when you refresh accidentaly, it doesnt overwirte the pvk and data
				history.pushState('', '', '?ppk='+e.privateKey+'&data='+e.data+'&am='+e.amount+'&addr='+e.address);
			}
			
			var init = function(e) {
				
				
				// fires after initiation of the element
				
				
				
				
			}
			
			
			var dgp = $('#digipay').digipay({
				'onSuccess':success,
				'onInitialize':init,
				'onNewPayment':newpay,
				'onFail':failed,	
			})
			
			var pvk = fgp('ppk');
			
			var data =  fgp('data') || makeid(10);
			
			var address = fgp('addr') || false;
			
			var amount = fgp('am') || false;
			
			
			// satoshi

			// returns the digipay class, not a jquery element
		
			
			if(address && pvk && data && amount) {
				
				dgp.setSettings({amount,address});
				dgp.newPayment(data,pvk);
			
			
			
			}
			
			
			
			
			// there is no pvk, it will generate a new one.
			
			
			$(window).resize(function() {
				dgp.resize();

				
			
			});
			

			
			
			$('#newtx').on('click',function() {
				var namount = digibyte.Unit.fromBTC(parseFloat($('#amount').val())).toSatoshis();
				$('#digipay').digipay({
					amount:namount,
					address:$('#address').val()
				}).newPayment(makeid(10));
				
			});
				
				
			$('#abort').on('click',function() {
			
				dgp.abort();
			
			});
				
				
				
				
				
			function makeid(l){ var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(var i=0;i<l;i++){t+=p.charAt(Math.floor(Math.random()*p.length))};return t;}
				
			function fgp(parameterName) {
			var result = null,
				tmp = [];
			var items = location.search.substr(1).split("&");
			for (var index = 0; index < items.length; index++) {
				tmp = items[index].split("=");
				if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
			}
			return result;}
			$('pre code').each(function(i, block) {
				hljs.highlightBlock(block);
			});

		