# DigiDeal
DigiByte javascript/jQuery client side  payment method.

This Jquery plugin makes it that people can accept DigiByte payments on their website, tablet, and or other webinterface supporting device. 
It generates a QR and snifs the DigiExplorer website te check if the payment has the required confirmations. It fires 4 eventhandlers.
  onInitialize is fired when the interface is set up.
  onFail is fired when it is impossible to get any of the DigiExplorer API calls.
  onSuccess is fired when the payment is complete.
  onNewPayment is fired when a new payment is made
  This function is entirely clientside and doesnt need extra installations of the DigiByte software. It has a direct connection to the DigiExplorer website wich enables it to make calls about UTXO, Walletvalue and to make transactions.
  The downside to clientside payments is that security pitfalls need to be covered by the user and developer that want to use this implementation. I personally have NO responsibility regarding fraudulent use and/or improper use.
  A documentation will follow with additional information regarding the input parameters and use of this software. 
  
  An example can be found at https://beatnutnl.github.io/DigiDeal
