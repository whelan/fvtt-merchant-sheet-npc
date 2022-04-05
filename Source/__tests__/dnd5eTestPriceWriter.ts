import Dnd5eCurrencyCalculator from "../merchant/systems/Dnd5eCurrencyCalculator";

const calculator = new Dnd5eCurrencyCalculator()

describe('Prices shown as correct values', () => {
	test('should return 10 gp', () => {
		expect(calculator.priceInText(10)).toBe("10gp");
	});
	test('should return 10 gp 1 sp', () => {
		expect(calculator.priceInText(10.1)).toBe("10gp 1sp");
	});
	test('should return 8 gp 6 sp with EP enabled', () => {
		expect(calculator.priceInText(8.6)).toBe("8gp 1ep 1sp");
	});
	test('should return 8 gp 6 sp with EP disabled', () => {
		calculator.useEP = false;
		expect(calculator.priceInText(8.6)).toBe("8gp 6sp");
	});
	test('should return 8 gp 5 sp with EP disabled', () => {
		calculator.useEP = false;
		expect(calculator.priceInText(8.5)).toBe("8gp 5sp");
	});

});