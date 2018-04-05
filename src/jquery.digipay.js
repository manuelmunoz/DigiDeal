(function($) {

	$.fn.digipay = function (options,value) {
		
		var data = $(this).data('_digipay');

		if(data) {
				
			// already setup a payment before
		
		
			// set options accordingly after the class has been made

			if(typeof options =='object') {
			
				data.setSettings(options);

			} else {
				if(typeof options == 'string') {
					if(typeof value !== 'undefined') {
						var settings = {};
						settings[options]=value;
						data.setSettings(settings);
					} else {

						if(typeof data[options] === 'function') {
							
							return data[options]();
						}
						return data[options];
					}
				} 
			}
			
			
			return data;
			
			
		} else {

			var settings = $.extend({}, $.fn.digipay.defaults, options);
			// these paramters are required

			if(this.selector.indexOf('#') === -1) {
				throw('DigiPay can only be called with an ID, not a class or "naked" element');
			}
			$(this).empty();
			var dgp = new DigiPay(settings,$(this));
			
			// add the HTML to the element
			$(this).append(dgp.main);
			
			
			// store the class in the element for future use
			$(this).data('_digipay',dgp);
		
			return dgp;
			
		}
		
		
		
	};
	
	
	$.fn.digipay.defaults = {

		// Theme
		// 'light','dark'
		theme:'dark',
		
		
		
		// this parameter enables the option to pay a little % with a max cap to the DigiByte foundation.
		//	In order to keep this service running we make use of the digiexplorer api and it costs money to run.
		// this option is default on, if you switch it off, do consider donating directly to the foundation. DFVsFBiKuaL5HM9NWZgdHTQecLNit6tX5Y is the addres
		// optionally you can look here https://digibytefoundation.org/donate
		coulance: true,
		
		// required confirmations of the network to accept the payment as legit. i set 3, but for small payments. 
		//it is best to do this at 6, but that takes long ( block timing is about 15 seconds )
		requiredConfirmations : 2,
		
		
		
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






