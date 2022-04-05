class HtmlHelpers {
	static getHtmlInputStringValue(input: string, document: Document): string {
		return (<HTMLInputElement>document.getElementById(input)).value;
	}

	static getHtmlInputNumberValue(input: string, document: Document): number {
		return parseInt((<HTMLInputElement>document.getElementById(input)).value, 10);
	}

	static getHtmlInputBooleanValue(input: string, document: Document): boolean {
		return (<HTMLInputElement>document.getElementById(input)).checked;
	}
}
export default HtmlHelpers;