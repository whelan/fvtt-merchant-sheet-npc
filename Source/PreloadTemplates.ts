import Globals from "./Globals";

const PreloadTemplates = async (): Promise<Handlebars.TemplateDelegate<any>[]> => {
	const rootPath = `modules/${Globals.ModuleName}/templates/`;
	// Place relative paths in array below, e.g.:
	// const templates = [ rootPath + "actor/actor-sheet.hbs" ]
	// This would map to our local folder of /Assets/Templates/Actor/actor-sheet.hbs
	const templates: Array<string> = [];
	return loadTemplates(templates);
}

export default PreloadTemplates;