(function($) {

	$.fn.digipay = function (options,value) {
		
		var data = $(this).data('_digipay');
		
	
		
		
		if(data) {
		
			// set options accordingly after the class has been made
			
			
			if(typeof options =='object') {
				
				
				data.settings = options;
				
				
				
			} else {
				if(typeof options == 'string') {
					if(typeof value !== 'undefined') {
						var settings = {};
						settings[options]=value;
						data.settings = settings;
					} else {
						return data[options];
					}
				} 
			}
			
			
			$(this).data('_digipay',data);
			
			
		} else {

			var settings = $.extend({}, $.fn.digipay.defaults, options);
			// these paramters are required
			
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
			
			
			
			
			
			
			
			var dgp = new DigiPay(settings);

			// add the HTML to the element
			$(this).append(dgp.getHtml());
			
			// store the class in the element for future use
			$(this).data('_digipay',dgp);
		
			
			
			
			dgp.checkPayment();
			
			
			
		
			
		}
		
		return $(this);
		
		
	};
	
	
	$.fn.digipay.defaults = {
		// size of the QR, not the element. 
		size:300,
		
		
		
		// Theme
		// 'light','dark'
		theme:'dark',
		
		
		
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
		
		
		// minimum transaction amount. Also digiexplorer is giving a hard time. it needs an output of at least 70.000 sat or it will bounce.
		mintx:70000,
		
		
		// this function will be called when the script updates is status during verification of the payment process.
		onStatusUpdate:false,
		
		
		
		// this parameter specifies if a validation of input needs to be done. It is highly recommended to leave this on true.
		validate:true
	};
	
	
	
})(jQuery);	






