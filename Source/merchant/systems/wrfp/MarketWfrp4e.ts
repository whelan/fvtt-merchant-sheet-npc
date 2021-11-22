
/**
 * WIP
 * This class contains functions and helpers related to the market and Pay system
 */
export default class MarketWfrp4e {
	/**
     * Roll a test for the availability and the stock quantity of an item based on the rulebook
     * Takes as a parameter an object with localized settlement type, localized rarity and a modifier for the roll
     * @param {Object} options settlement, rarity, modifier
     */

    /**
     * Format an availability test before sending it to chat
     * @param {Object} result
     */
    static formatTestForChat(result: any) {
        return `
        <b>${(<Game>game).i18n.localize("MARKET.SettlementSize")}</b> ${result.settlement}<br>
        <b>${(<Game>game).i18n.localize("MARKET.Rarity")}</b> ${result.rarity}<br><br>
        <b>${(<Game>game).i18n.localize("MARKET.InStock")}</b> ${result.instock}<br>
        <b>${(<Game>game).i18n.localize("MARKET.QuantityAvailable")}</b> ${result.quantity}<br>
        <b>${(<Game>game).i18n.localize("Roll")}:</b> ${result.roll}
      `;
    }


    /**
     * Consolidate every money the player has in order to give him the fewer coins possible
     * @param {Array} money
     */
    static consolidateMoney(money: any) {
        //We sort the money from the highest BP value to the lowest (so gc => ss => bp)
        //This allow us to deal with custom money too and to not be dependent on the money name (translation errors could break the code otherwise)
        money.sort((a: any, b: any) => b.data.coinValue.value - a.data.coinValue.value);

        let brass = 0;
        //First we calculate the BP value
        for (let m of money)
            brass += m.data.quantity.value * m.data.coinValue.value;

        //Then we consolidate the coins
        for (let m of money) {
            //We don't know what players could create as a custom money and we dont want to divide by zero, ever. It would kill a kitten somewhere, probably.
            if (m.data.coinValue.value <= 0)
                break;
            m.data.quantity.value = Math.trunc(brass / m.data.coinValue.value);
            brass = brass % m.data.coinValue.value;
        }

        return money;
    }

    /**
     * Execute a /credit amount and add the money to the player inventory
     * @param {string} amount the amount of money transfered
     * @param {Array} moneyItemInventory
     */
    static creditCommand(amount: any, actor: any, options = {}) {
        //First we parse the amount
        // @ts-ignore
		let moneyItemInventory = actor.getItemTypes("money").map(i => i.toObject());
        let moneyToSend: any = this.parseMoneyTransactionString(amount);
        let msg = `<h3><b>${(<Game>game).i18n.localize("MARKET.CreditCommand")}</b></h3>`;
        let errorOccured = false;
        //Wrong amount
        if (!moneyToSend) {
            msg += `<p>${(<Game>game).i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${(<Game>game).i18n.localize("MARKET.CreditCommandExample")}</i></p>`;
            errorOccured = true;
        }
        //Command is ok, let's try to pay
        else {
            //We need to get the character money items for gc, ss and bp. This is a "best effort" lookup method. If it fails, we stop the amount to prevent any data loss.
            let characterMoney = this.getCharacterMoney(moneyItemInventory);
            this.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);

            //If one money is missing, we stop here before doing anything bad
            if (Object.values(characterMoney).includes(false)) {
                msg += `<p>${(<Game>game).i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
                errorOccured = true;
            } else {
                //Great, we can just deduce the quantity for each money
                // @ts-ignore
				moneyItemInventory[characterMoney.gc].data.quantity.value += moneyToSend.gc;
                // @ts-ignore
				moneyItemInventory[characterMoney.ss].data.quantity.value += moneyToSend.ss;
                // @ts-ignore
				moneyItemInventory[characterMoney.bp].data.quantity.value += moneyToSend.bp;
            }
        }
        if (errorOccured)
            moneyItemInventory = false;
        else {
            // @ts-ignore
			msg += (<Game>game).i18n.format("MARKET.Credit", {
                number1: moneyToSend.gc,
                number2: moneyToSend.ss,
                number3: moneyToSend.bp
            });
            msg += `<br><b>${(<Game>game).i18n.localize("MARKET.ReceivedBy")}</b> ${actor.name}`;
            this.throwMoney(moneyToSend)

        }
		// @ts-ignore
		ui.notifications.notify(`${actor.name} received ${moneyToSend.gc}${(<Game>game).i18n.localize("MARKET.Abbrev.GC")} ${moneyToSend.ss}${(<Game>game).i18n.localize("MARKET.Abbrev.SS")} ${moneyToSend.bp}${(<Game>game).i18n.localize("MARKET.Abbrev.BP")}`)
        return moneyItemInventory;
    }

    /**
     * Execute a /pay command and remove the money from the player inventory
     * @param {String} command
     * @param {Array} moneyItemInventory
     * @param transactionType  game.wfrp4e.config.transactionType, is it a payment or an income
     */
    static payCommand(command: any, actor: any, options = {}) {
        //First we parse the command
        // @ts-ignore
		let moneyItemInventory = actor.getItemTypes("money").map(i => i.toObject())
        let moneyToPay = this.parseMoneyTransactionString(command);
        let msg = `<h3><b>${(<Game>game).i18n.localize("MARKET.PayCommand")}</b></h3>`;
        let errorOccured = false;
        //Wrong command
        if (!moneyToPay) {
            msg += `<p>${(<Game>game).i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${(<Game>game).i18n.localize("MARKET.PayCommandExample")}</i></p>`;
            errorOccured = true;
        }
        //Command is ok, let's try to pay
        else {
            //We need to get the character money items for gc, ss and bp. This is a "best effort" lookup method. If it fails, we stop the command to prevent any data loss.
            let characterMoney = this.getCharacterMoney(moneyItemInventory);
            this.checkCharacterMoneyValidity(moneyItemInventory, characterMoney);
            //If one money is missing, we stop here before doing anything bad
            if (Object.values(characterMoney).includes(false)) {
                msg += `<p>${(<Game>game).i18n.localize("MARKET.CantFindMoneyItems")}</p>`;
                errorOccured = true;
            } else {
                //Now its time to check if the actor has enough money to pay
                //We'll start by trying to pay without consolidating the money
                // @ts-ignore
				if (moneyToPay.gc <= moneyItemInventory[characterMoney.gc].data.quantity.value && moneyToPay.ss <= moneyItemInventory[characterMoney.ss].data.quantity.value && moneyToPay.bp <= moneyItemInventory[characterMoney.bp].data.quantity.value) {
                    //Great, we can just deduce the quantity for each money
                    // @ts-ignore
					moneyItemInventory[characterMoney.gc].data.quantity.value -= moneyToPay.gc;
                    // @ts-ignore
					moneyItemInventory[characterMoney.ss].data.quantity.value -= moneyToPay.ss;
                    // @ts-ignore
					moneyItemInventory[characterMoney.bp].data.quantity.value -= moneyToPay.bp;
                } else //We'll need to calculate the brass value on both the pay command and the actor inventory, and then consolidate
                {
                    let totalBPAvailable = 0;
                    for (let m of moneyItemInventory)
                        totalBPAvailable += m.data.quantity.value * m.data.coinValue.value;

                    let totalBPPay = moneyToPay.gc * 240 + moneyToPay.ss * 12 + moneyToPay.bp;

                    //Does we have enough money in the end?
                    if (totalBPAvailable < totalBPPay) {
                        //No
                        msg += `${(<Game>game).i18n.localize("MARKET.NotEnoughMoney")}<br>
              <b>${(<Game>game).i18n.localize("MARKET.MoneyNeeded")}</b> ${totalBPPay} ${(<Game>game).i18n.localize("NAME.BP")}<br>
              <b>${(<Game>game).i18n.localize("MARKET.MoneyAvailable")}</b> ${totalBPAvailable} ${(<Game>game).i18n.localize("NAME.BP")}`;
                        errorOccured = true;
                    } else //Yes!
                    {
                        totalBPAvailable -= totalBPPay;
                        // @ts-ignore
						moneyItemInventory[characterMoney.gc].data.quantity.value = 0;
                        // @ts-ignore
						moneyItemInventory[characterMoney.ss].data.quantity.value = 0;
                        // @ts-ignore
						moneyItemInventory[characterMoney.bp].data.quantity.value = totalBPAvailable;

                        //Then we consolidate
                        moneyItemInventory = this.consolidateMoney(moneyItemInventory);
                    }
                }
            }
        }
        if (errorOccured)
            moneyItemInventory = false;
        else {
            // @ts-ignore
			msg += (<Game>game).i18n.format("MARKET.Paid", {number1: moneyToPay.gc, number2: moneyToPay.ss, number3: moneyToPay.bp
            });
            msg += `<br><b>${(<Game>game).i18n.localize("MARKET.PaidBy")}</b> ${actor.name}`;

            this.throwMoney(moneyToPay)
        }
		// @ts-ignore
		ui.notifications.notify(msg)
        return moneyItemInventory;
    }

    /**
     * we'll try to look for the coin value equals to the gc/ss/bp coin value for any entry that wasn't found.
     * This allows for a better chance at detecting the money items, as they are currently not properly identified by a unique id. Meaning if a translation module made a typo in the compendium
     * or if a player/gm edit the name of the money items for any reasons, it would not be found by the first method
     * @param moneyItemInventory
     * @param characterMoney
     */
    static checkCharacterMoneyValidity(moneyItemInventory: any, characterMoney: any) {
        for (let m = 0; m < moneyItemInventory.length; m++) {
            switch (moneyItemInventory[m].data.coinValue.value) {
                case 240://gc
                    if (characterMoney.gc === false)
                        characterMoney.gc = m;
                    break;
                case 12://ss
                    if (characterMoney.ss === false)
                        characterMoney.ss = m;
                    break;
                case 1://bp
                    if (characterMoney.bp === false)
                        characterMoney.bp = m;
                    break;
            }
        }
    }

    /**
     * From a moneyItemInventory we get the money of the character (GC, SS and BP)
     * @param moneyItemInventory
     * @returns {{ss: boolean, gc: boolean, bp: boolean}}
     */
    static getCharacterMoney(moneyItemInventory: any) {
        let moneyTypeIndex = {
            gc: false,
            ss: false,
            bp: false
        }
        //First we'll try to look at the localized name
        for (let m = 0; m < moneyItemInventory.length; m++) {
            switch (moneyItemInventory[m].name) {
                case (<Game>game).i18n.localize("NAME.GC"):
					// @ts-ignore
					moneyTypeIndex.gc = m;
                    break;
                case (<Game>game).i18n.localize("NAME.SS"):
					// @ts-ignore
					moneyTypeIndex.ss = m;
                    break;
                case (<Game>game).i18n.localize("NAME.BP"):
					// @ts-ignore
					moneyTypeIndex.bp = m;
                    break;
            }
        }
        return moneyTypeIndex;
    }

    static throwMoney(moneyValues: any)
    {
        let number = moneyValues.gc || 0;
        if ((moneyValues.ss || 0) > number)
            number = moneyValues.ss || 0
        if ((moneyValues.bp || 0) > number)
            number = moneyValues.bp || 0

        // @ts-ignore
		if ((<Game>game).dice3d && (<Game>game).settings.get("wfrp4e", "throwMoney")) {
			// @ts-ignore
			(<Game>game).dice3d.showForRoll(new Roll(`${number}dc`).roll())
		}
    }

    /**
     * Parse a price string
     * Like "8gc6bp" or "74ss 12gc", etc
     * This method use localized abbreviations
     * return an object with the moneys and quantity
     * @param {String} string
     * @returns {Object}
     */
    static parseMoneyTransactionString(str: string) {
        //Regular expression to match any number followed by any abbreviation. Ignore whitespaces
        const expression = /((\d+)\s?(\p{L}+))/ug
        let matches = [...str.matchAll(expression)];

        let payRecap = {
            gc: 0,
            ss: 0,
            bp: 0
        };
        let isValid: Boolean = matches.length > 0;
        for (let match of matches) {
            //Check if we have a valid command. We should have 4 groups per match
            if (match.length !== 4) {
                isValid = false;
                break;
            }
            //Should contains the abbreviated money (like "gc")
            switch (match[3].toLowerCase()) {
                case (<Game>game).i18n.localize("MARKET.Abbrev.GC").toLowerCase():
                    payRecap.gc += parseInt(match[2], 10);
                    break;
                case (<Game>game).i18n.localize("MARKET.Abbrev.SS").toLowerCase():
                    payRecap.ss += parseInt(match[2], 10);
                    break;
                case (<Game>game).i18n.localize("MARKET.Abbrev.BP").toLowerCase():
                    payRecap.bp += parseInt(match[2], 10);
                    break;
            }
        }
        if (isValid && (payRecap.gc + payRecap.ss + payRecap.bp === 0))
            isValid = false;
        if (isValid && (payRecap.gc + payRecap.ss + payRecap.bp === 0))
            isValid = false;
        return isValid ? payRecap : false;
    }

    /**
     * Generate a card in the chat with a "Pay" button.
     * GM Only
     * @param {String} payRequest
     */
    static generatePayCard(payRequest: any, player: User) {
        let parsedPayRequest = this.parseMoneyTransactionString(payRequest);
        //If the /pay command has a syntax error, we display an error message to the gm
        if (!parsedPayRequest) {
            let msg = `<h3><b>${(<Game>game).i18n.localize("MARKET.PayRequest")}</b></h3>`;
            msg += `<p>${(<Game>game).i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${(<Game>game).i18n.localize("MARKET.PayCommandExample")}</i></p>`;
        } else //generate a card with a summary and a pay button
        {
            let cardData = {
                payRequest: payRequest,
                QtGC: parsedPayRequest.gc,
                QtSS: parsedPayRequest.ss,
                QtBP: parsedPayRequest.bp
            };
            renderTemplate("systems/wfrp4e/templates/chat/market/market-pay.html", cardData).then(html => {
            });
        }
    }

           /**
         * Make some change ... to avoid player going around with tons of bronze coins
         * @param {int} amount
         * @returns {Object} an amount {amount.gc,amount.ss,amount.bp}
         */
        static makeSomeChange(amount: number, bpRemainder: Boolean) {
            let gc = 0, ss = 0, bp = 0;
            if (amount >= 0) {
                gc = Math.floor(amount / 240)
                amount = amount % 240
                ss = Math.floor(amount / 12)
                bp = amount % 12
                bp = bp + ((bpRemainder) ? 1 : 0);
            }
            return { gc: gc, ss: ss, bp: bp };
        }

                /**
         * Transforms an amount of money to a string with value + currency like 2gc4ss8bp localized.
         * @param {Object} amount
         * @return {String} the amount
         */
        static amountToString(amount: any) {
            let gc = (<Game>game).i18n.localize("MARKET.Abbrev.GC")
            let ss = (<Game>game).i18n.localize("MARKET.Abbrev.SS")
            let bp = (<Game>game).i18n.localize("MARKET.Abbrev.BP")
            return `${amount.gc}${gc} ${amount.ss}${ss} ${amount.bp}${bp}`
        }


                /**
         *
         * @param initialAmount {Object} {initialAmount.gc,initialAmount.ss,initialAmount.bp}
         * @param {int} nbOfPlayers to split among them
         * return amount {Object} an amount {amount.gc,amount.ss,amount.bp}
         */
        static splitAmountBetweenAllPlayers(initialAmount: any, nbOfPlayers: any) {
            // convert initialAmount in bp
            let bpAmount = initialAmount.gc * 240 + initialAmount.ss * 12 + initialAmount.bp;
            // divide bpAmount by nb of players and get the true remainder
            let bpRemainder = bpAmount % nbOfPlayers;
            bpAmount = Math.floor(bpAmount / nbOfPlayers);
            // rebuild an amount of gc/ss/bp from bpAmount
            let amount = this.makeSomeChange(bpAmount, bpRemainder > 9);
            return amount;
        }


    /**
     * Generate a card in the chat with a "Receive" button.
     * GM Only
     * @param {String} creditRequest
     * @param { game.wfrp4e.config.creditOptions} option
     */
    static generateCreditCard(creditRequest: any, option = "EACH") {
        let parsedPayRequest = this.parseMoneyTransactionString(creditRequest);

        //If the /credit command has a syntax error, we display an error message to the gm
        if (!parsedPayRequest) {
            let msg = `<h3><b>${(<Game>game).i18n.localize("MARKET.CreditRequest")}</b></h3>`;
            msg += `<p>${(<Game>game).i18n.localize("MARKET.MoneyTransactionWrongCommand")}</p><p><i>${(<Game>game).i18n.localize("MARKET.CreditCommandExample")}</i></p>`;
        } else //generate a card with a summary and a receive button
        {
            let amount

            // @ts-ignore
			let nbActivePlayers = Array.from(game.users).filter(u => u.data.role != 4 && u.active).length;
            let forceWhisper

            let message
            if (nbActivePlayers == 0) {
                message = (<Game>game).i18n.localize("MARKET.NoPlayers");
                ChatMessage.create({ content: message });
                return
            }
            else { // @ts-ignore
				if (option.toLowerCase() ===  game.wfrp4e.config.creditOptions.SPLIT.toLowerCase()) {
								amount = this.splitAmountBetweenAllPlayers(parsedPayRequest, nbActivePlayers);
								message = (<Game>game).i18n.format("MARKET.RequestMessageForSplitCredit", {
									activePlayerNumber: nbActivePlayers,
									initialAmount: this.amountToString(parsedPayRequest)
								});
							}
							else { // @ts-ignore
					if (option.toLowerCase() ===  game.wfrp4e.config.creditOptions.EACH.toLowerCase()) {
													amount = parsedPayRequest;
													message = (<Game>game).i18n.format("MARKET.RequestMessageForEachCredit", {
														activePlayerNumber: nbActivePlayers,
														initialAmount: this.amountToString(parsedPayRequest)
													});
												}
												else {
													amount = parsedPayRequest;
													let pname = option.trim().toLowerCase();
													// @ts-ignore
						let player = (<Game>game).users.players.filter(p => p.data.name.toLowerCase() == pname);
													if (player[0]) { // Player found !
														forceWhisper = player[0].data.name;
														message = (<Game>game).i18n.format("MARKET.CreditToUser", {
															userName: player[0].data.name,
															initialAmount: this.amountToString(parsedPayRequest)
														});
													} else {
														message = (<Game>game).i18n.localize("MARKET.NoMatchingPlayer");
														ChatMessage.create({ content: message });
														return
													}
												}
				}
			}
            let cardData = {
                digestMessage: message,
                amount: this.amountToString(amount),
                QtGC: amount.gc,
                QtSS: amount.ss,
                QtBP: amount.bp
            };
            renderTemplate("systems/wfrp4e/templates/chat/market/market-credit.html", cardData).then(html => {
            });
        }
    }
}
