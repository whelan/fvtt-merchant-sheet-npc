import Globals from "../Globals";
import Color from "color";

class Logger {
	// static class
	private constructor() {}

	private static GetCurrentTime(): string {
		return `[${(new Date().toLocaleTimeString())}] `;
	}

	static LogWithOptions(str: string, colour: Color = Color("white"), bold = false, ...params: any): void {
		const time = ToConsole(Logger.GetCurrentTime(), Color("gray"), false)
		const moduleName = ToConsole(Globals.ModuleName + " ", Color("cyan"), true);
		const text = ToConsole(str, colour, bold);
		if (params === null || params.length > 0 ) {
			console.log(time.str + moduleName.str + text.str, ...time.params.concat(moduleName.params, text.params), params);
		} else {
			console.log(time.str + moduleName.str + text.str, ...time.params.concat(moduleName.params, text.params));
		}
	}

	static Log(str: string, ...params: any): void {
		this.LogWithOptions(str, Color("white"), false, params)
	}

	static Err(str: string): void {
		Logger.LogWithOptions(str, Color("orange"));
	}

	static Warn(str: string): void {
		Logger.LogWithOptions(str, Color("yellow"));
	}

	static Ok(str: string): void {
		Logger.LogWithOptions(str, Color("green"));
	}
}

interface ConsoleColour {
	str: string,
	params: Array<string>;
}

const ToConsole = (str: string, col: Color, bold: boolean): ConsoleColour => {
	return {
		str: `%c` + str + `%c`,
		params: [
			"color: " + col.hex() + ";" + (bold ? "font-weight: bold;" : ""),
			"color: unset; font-weight: unset;"
		]
	}
};

export default Logger;