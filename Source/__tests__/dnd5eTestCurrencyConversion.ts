import Dnd5eCurrencyCalculator from "../merchant/systems/Dnd5eCurrencyCalculator";

const calculator = new Dnd5eCurrencyCalculator()

describe('Calc', () => {
	test('should return 10 gp', () => {
		expect(calculator.priceInText(10)).toBe("1 pp");
	});
	test('should return 1000', () => {
		expect(calculator.convertCurrencyToLowest({pp: 0, gp: 10, ep: 0, sp: 0, cp: 0})).toBe(1000);
	});
	test('should return 1000', () => {
		expect(calculator.convertCurrencyToLowest({pp: 1, gp: 0, ep: 0, sp: 0, cp: 0})).toBe(1000);
	});
	test('should return 50', () => {
		expect(calculator.convertCurrencyToLowest({pp: 0, gp: 0, ep: 1, sp: 0, cp: 0})).toBe(50);
	});
	test('should return 10', () => {
		expect(calculator.convertCurrencyToLowest({pp: 0, gp: 0, ep: 0, sp: 1, cp: 0})).toBe(10);
	});
	test('should return 1', () => {
		expect(calculator.convertCurrencyToLowest({pp: 0, gp: 0, ep: 0, sp: 0, cp: 1})).toBe(1);
	});
	test('should return 100', () => {
		expect(calculator.convertCurrencyToLowest({gp: 1})).toBe(100);
	});
	test('should have 1 cp in buyerFunds', () => {
		expect(calculator.calculateNewBuyerFunds(0.01, {pp: 0, gp: 0, ep: 0, sp: 0, cp: 2})).toStrictEqual({pp: 0, gp: 0, ep: 0, sp: 0, cp: 1});
	});
	test('should have 1 cp in buyerFunds convert false', () => {
		expect(calculator.calculateNewBuyerFunds(0.01, {pp: 0, gp: 0, ep: 0, sp: 0, cp: 2})).toStrictEqual({pp: 0, gp: 0, ep: 0, sp: 0, cp: 1});
	});
	test('should have 9 gp,ep 0 sp 0, cp 1 in buyerFunds convert false', () => {
		expect(calculator.calculateNewBuyerFunds(1.01, {pp: 1, gp: 0, ep: 0, sp: 0, cp: 2})).toStrictEqual({pp: 0, gp: 9, ep: 0, sp: 0, cp: 1});
	});
	test('should have 1 pp, 0 gp,ep 0 sp 4, cp 1 in buyerFunds convert false', () => {
		expect(calculator.calculateNewBuyerFunds(1.21, {pp: 1, gp: 1, ep: 1, sp: 1, cp: 2})).toStrictEqual({pp: 1, gp: 0, ep: 0, sp: 4, cp: 1});
	});
	test('Change EP from 1 to 5 SP', () => {
		expect(calculator.convertEP({pp: 0, gp: 0, ep: 1, sp: 0, cp: 0})).toStrictEqual({pp: 0, gp: 0, ep: 0, sp: 5, cp: 0});
	});
	test('Change EP from 2 to 1 GP', () => {
		expect(calculator.convertEP({pp: 0, gp: 0, ep: 2, sp: 0, cp: 0})).toStrictEqual({pp: 0, gp: 1, ep: 0, sp: 0, cp: 0});
	});
	test('Change EP from 3 to 1 GP and 5 SP', () => {
		expect(calculator.convertEP({pp: 0, gp: 0, ep: 3, sp: 0, cp: 0})).toStrictEqual({pp: 0, gp: 1, ep: 0, sp: 5, cp: 0});
	});
	test('Change EP from 10 to 5 GP', () => {
		expect(calculator.convertEP({pp: 0, gp: 0, ep: 10, sp: 0, cp: 0})).toStrictEqual({pp: 0, gp: 5, ep: 0, sp: 0, cp: 0});
	});
	test('Change EP from 0 to 0 GP', () => {
		expect(calculator.convertEP({pp: 0, gp: 0, ep: 0, sp: 0, cp: 0})).toStrictEqual({pp: 0, gp: 0, ep: 0, sp: 0, cp: 0});
	});
	test('calculateItemToBuyerFund 10.01 GP => 1 pp, 1 cp', () => {
		expect(calculator.calculatePriceToBuyerFunds(10.01)).toStrictEqual({pp: 1, gp: 0, ep: 0, sp: 0, cp: 1});
	});
	test('calculateItemToBuyerFund 11.88 GP => 1 pp,1gp,1ep,3sp, 8 cp', () => {
		expect(calculator.calculatePriceToBuyerFunds(11.88)).toStrictEqual({pp: 1, gp: 1, ep: 1, sp: 3, cp: 8});
	});
});