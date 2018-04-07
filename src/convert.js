class DigiConverter {
	
	
	constructor() {
		
		
		this.marketUrl = 'https://min-api.cryptocompare.com/data/price?fsym=DGB&tsyms=USD';
		this.convertUrl = 'https://free.currencyconverterapi.com/api/v5/convert?q=';
		this.currencies = ['AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BND','BOB','BRL','BSD','BTC','BTN','BWP','BYN','BYR','BZD','CAD','CDF','CHF','CLP','CNY','COP','CRC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD','LSL','LVL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRO','MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','sel','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLL','SOS','SRD','STD','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD','UYU','UZS','VEF','VND','VUV','WST','XAF','XCD','XDR','XOF','XPF','YER','ZAR','ZMW'];
		
	}
	
	getCurrencies() {

		return this.currencies;
		
	}
	
	to(val,cur) {
		return new Promise((resolve,reject) => {
			this.getCurrentPrice().then( USD => {
				
				var q = 'USD_'+cur;
				$.getJSON(this.convertUrl+q+'&compact=y', function( data ) {
					resolve(val/data[q].val/USD);
				});
				
				
				
				
			},error => {
				reject(error);
			});
	
			
		});
	
		
	}
	
	getCurrentPrice() {
		return new Promise((resolve, reject) => {
			$.getJSON(this.marketUrl, function( data ) {
				resolve(data.USD);
			}).error(function(e){
				reject('price not found');
			});
		});
		
		
	}
	
}