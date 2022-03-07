import * as gulp from "gulp";
import fs from "fs";
import * as path from "path";
import archiver from "archiver";
import stringify from "json-stringify-pretty-compact";

const sourcemaps = require('gulp-sourcemaps');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');

const loadJson = (path: string): any => {
    Logger.Log(path)
    try {
        const str = fs.readFileSync(path).toString();
        return JSON.parse(str);
    }
    catch {
        throw Error("Unable to load module.json")
    }
};

import {
    createLiteral,
    factory,
    isExportDeclaration,
    isImportDeclaration,
    isStringLiteral,
    LiteralExpression,
    Node,
    TransformationContext,
    Transformer as TSTransformer,
    TransformerFactory,
    visitEachChild,
    visitNode,
} from "typescript";
import less from "gulp-less";

import Logger from "./Source/Utils/Logger";
import {ModuleData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import browserify from "browserify";
import tsify = require("tsify");

const ts = require("gulp-typescript");
const git = require("gulp-git");
const jest = require('gulp-jest').default;

const argv = require("yargs").argv;

function getConfig() {
    const configPath = path.resolve(process.cwd(), "foundryconfig.json");
    let config;

    if (fs.existsSync(configPath)) {
        config = loadJson(configPath);
        return config;
    } else {
        return;
    }
}

interface Manifest {
    root: string;
    file: ModuleData;
    name: string;
}

const getManifest = (): Manifest | null => {
    const json: Manifest = {
        root: "",
        // @ts-ignore
        file: {},
        name: ""
    };

    if (fs.existsSync("Source")) {
        json.root = "Source";
    } else {
        json.root = "dist";
    }

    const modulePath = path.join(json.root, "module.json");
    const systemPath = path.join(json.root, "system.json");

    if (fs.existsSync(modulePath)) {
        json.file = loadJson(modulePath) as ModuleData;
        json.name = "module.json";
    } else if (fs.existsSync(systemPath)) {
        json.file = loadJson(systemPath) as ModuleData;
        json.name = "system.json";
    } else {
        return null;
    }

    // If we can pull our version from our package - saves us having to maintain the number in different places
    if (process.env.npm_package_version)
        json.file!.version = process.env.npm_package_version;

    return json;
}

const createTransformer = (): TransformerFactory<any> => {
    /**
     * @param {typescript.Node} node
     */
    const shouldMutateModuleSpecifier = (node: Node): boolean => {
        if (!isImportDeclaration(node) && !isExportDeclaration(node))
            return false;
        if (node.moduleSpecifier === undefined)
            return false;
        if (!isStringLiteral(node.moduleSpecifier))
            return false;
        if (!node.moduleSpecifier.text.startsWith("./") && !node.moduleSpecifier.text.startsWith("../"))
            return false;

        return path.extname(node.moduleSpecifier.text) === "";
    }

    return (context: TransformationContext): TSTransformer<any> => {
        return (node: Node) => {
            function visitor(node: Node): Node {
                if (shouldMutateModuleSpecifier(node)) {
                    if (isImportDeclaration(node)) {
                        const newModuleSpecifier = createLiteral(`${(node.moduleSpecifier as LiteralExpression).text}.js`);
                        return factory.updateImportDeclaration(node, node.decorators, node.modifiers, node.importClause, newModuleSpecifier,undefined);
                    } else if (isExportDeclaration(node)) {
                        const newModuleSpecifier = createLiteral(`${(node.moduleSpecifier as LiteralExpression).text}.js`);
                        return factory.updateExportDeclaration(node, node.decorators, node.modifiers, false, node.exportClause, newModuleSpecifier,undefined);
                    }
                }
                return visitEachChild(node, visitor, context);
            }

            return visitNode(node, visitor);
        };
    };
}

const tsConfig = ts.createProject("tsconfig.json", {
    getCustomTransformers: (_program: any) => ({
        after: [createTransformer()],
    }),
});

function buildTS() {
    const debug = process.env.npm_lifecycle_event !== "package";
    let res = tsConfig.src()
        .pipe(sourcemaps.init())
        .pipe(tsConfig());

    return res.js
        .pipe(sourcemaps.write('', { debug: debug, includeContent: true, sourceRoot: './ts/Source' }))
        .pipe(gulp.dest("dist"));
}

const bundleModule = () => {
    const debug = argv.dbg || argv.debug;
    const bsfy = browserify(path.join(__dirname, "Source/index.ts"), { debug: debug });
    return bsfy.on('error', Logger.Err)
        .plugin(tsify)
        .bundle()
        .pipe(source(path.join("dist", "bundle.js")))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./'));
}

const buildLess = () => {
    return gulp.src("Source/Style/*.less").pipe(less()).pipe(gulp.dest("dist"));
}



const copyFiles = async() => {
    const statics = ["lang", "fonts", "assets", "templates", "packs", "module.json"];

    const recursiveFileSearch = (dir: string, callback: (err: NodeJS.ErrnoException | null, res: Array<string>) => void) => {
        let results: Array<string> = [];
        fs.readdir(dir, (err, list) => {
            if (err)
                return callback(err, results);

            let pending = list.length;
            if (!pending)
                return callback(null, results);

            for (let file of list) {
                file = path.resolve(dir, file);
                fs.stat(file, (err, stat) => {
                    if (stat && stat.isDirectory()) {
                        recursiveFileSearch(file, (err, res) => {
                            results = results.concat(res);
                            if (!--pending)
                                callback(null, results);
                        });
                    }
                    else {
                        results.push(file);
                        if (!--pending)
                            callback(null, results);
                    }
                });
            }
        });
    };
    Logger.Log("files:" + statics);
    try {
        for (const entity of statics) {
            let p = null;
            if (entity.endsWith("module.json") || entity.endsWith("templates") || entity.endsWith("lang")) {
                p = path.join("Source", entity);
            } else {
                p = path.join("Assets", entity);
            }
            if (fs.existsSync(p)) {
                if (fs.lstatSync(p).isDirectory())
                    recursiveFileSearch(p, (err: NodeJS.ErrnoException | null, res: Array<string>) => {
                        if (err)
                            throw err;

                        for (const file of res) {
                            const newFile = path.join("dist", path.relative(process.cwd(), file.replace(/[S]ource[\/\\]/g, '')));
                            Logger.Ok("Copying file: " + newFile);
                            const folder = path.parse(newFile).dir;
                            if (!fs.existsSync(folder))
                                fs.mkdirSync(folder, { recursive: true });
                            fs.copyFileSync(file, newFile);
                        }
                    })
                else {
                    Logger.Log("Copying file: " + p + " to " + path.join("dist", entity));
                    fs.copyFileSync(p, path.join("dist", entity));
                }
            }
        }
        return Promise.resolve();
    } catch (err) {
        await Promise.reject(err);
    }
}

const cleanDist = async () => {
    if (argv.dbg || argv.debug)
        return;
    Logger.Log("Cleaning dist file clutter");

    const files: string[] = [];
    const getFiles = async (dir: string) => {
        const arr = await fs.promises.readdir(dir);
        for(const entry of arr)
        {
            const fullPath = path.join(dir, entry);
            const stat = await fs.promises.stat(fullPath);
            if (stat.isDirectory())
                await getFiles(fullPath);
            else
                files.push(fullPath);
        }
    }

    await getFiles(path.resolve("./dist"));
    for(const file of files) {
        if (file.endsWith("bundle.js") || file.endsWith(".css") || file.endsWith("module.json") || file.endsWith("templates") || file.endsWith("lang")|| file.endsWith(".json") || file.endsWith(".html"))
            continue;

        Logger.Warn("Cleaning " + path.relative(process.cwd(), file));
        await fs.promises.unlink(file);
    }
}

/**
 * Watch for changes for each build step
 */
const buildWatch = () => {
    gulp.watch("Source/**/*.ts", { ignoreInitial: false }, gulp.series(buildTS, bundleModule));
    gulp.watch("Source/**/*.less", { ignoreInitial: false }, buildLess);
    gulp.watch(["Source/fonts", "Source/lang", "Source/templates", "Source/*.json"], { ignoreInitial: false }, copyFiles);
}

/********************/
/*		CLEAN		*/
/********************/

/**
 * Remove built files from `dist` folder
 * while ignoring source files
 */
const clean = async () => {
    if (!fs.existsSync("dist"))
        fs.mkdirSync("dist");

    const name = path.basename(path.resolve("."));
    const files = [];

    // If the project uses TypeScript
    if (fs.existsSync(path.join("Source", `index.ts`))) {
        files.push(
            "lang",
            "templates",
            "assets",
            "module",
            `index.js`,
            "module.json",
            "system.json",
            "template.json"
        );
    }

    // If the project uses Less
    if (fs.existsSync(path.join("Source/Style/", `${name}.less`))) {
        files.push("fonts", `${name}.css`);
    }

    // Attempt to remove the files
    try {
        for (const filePath of files) {
            if (fs.existsSync(path.join("dist", filePath)))
                fs.unlinkSync(path.join("dist", filePath));
        }
        return Promise.resolve();
    } catch (err) {
        await Promise.reject(err);
    }
}

const linkUserData = async () => {
    const name = getManifest()!.file.name;
    const config = loadJson("foundryconfig.json");

    let destDir;
    try {
        if (fs.existsSync(path.resolve(".", "dist", "module.json")) || fs.existsSync(path.resolve(".", "Source", "module.json"))) {
            destDir = "modules";
        } else {
            throw Error(`Could not find module.json or system.json`);
        }

        let linkDir;
        if (config.dataPath) {
            if (!fs.existsSync(path.join(config.dataPath, "Data")))
                throw Error("User Data path invalid, no Data directory found");

            linkDir = path.join(config.dataPath, "Data", destDir, name as string);
        } else {
            throw Error("No User Data path defined in foundryconfig.json");
        }

        if (argv.clean || argv.c) {
            Logger.Warn(`Removing build in ${linkDir}`);

            fs.unlinkSync(linkDir);
        } else if (!fs.existsSync(linkDir)) {
            Logger.Ok(`Copying build to ${linkDir}`);
            fs.symlinkSync(path.resolve("./dist"), linkDir);
        }
        return Promise.resolve();
    } catch (err) {
        await Promise.reject(err);
    }
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Package build
 */
async function packageBuild() {
    const manifest = getManifest();
    if (manifest === null)
    {
        Logger.Err("Manifest file could not be loaded.");
        throw Error();
    }

    return new Promise((resolve, reject) => {
        try {
            // Remove the package dir without doing anything else
            if (argv.clean || argv.c) {
                Logger.Warn("Removing all packaged files");
                fs.rmSync("package", { force: true, recursive: true });
                return;
            }

            // Ensure there is a directory to hold all the packaged versions
            fs.existsSync("package");

            // Initialize the zip file
            const zipName = `${manifest.file.name}-v${manifest.file.version}.zip`;
            const zipFile = fs.createWriteStream(path.join("package", zipName));
            const zip = archiver("zip", { zlib: { level: 9 } });

            zipFile.on("close", () => {
                Logger.Ok(zip.pointer() + " total bytes");
                Logger.Ok(`Zip file ${zipName} has been written`);
                return resolve(true);
            });

            zip.on("error", (err) => {
                throw err;
            });

            zip.pipe(zipFile);



            // Add the directory with the final code
            zip.file("dist/module.json", { name: "module.json" });
            zip.file("dist/bundle.js", { name: "bundle.js" });
            zip.glob("dist/*.css", {cwd:__dirname});
            zip.directory("dist/lang", "lang");
            zip.directory("dist/templates", "templates");
            Logger.Ok(`Zip files`);

            zip.finalize();
        } catch (err) {
            return reject(err);
        }
    });
}

/*********************/
/*		PACKAGE		 */
/*********************/

/**
 * Update version and URLs in the manifest JSON
 */
const updateManifest = (cb: any) => {
    const packageJson = loadJson("package.json");
    const config = getConfig(),
        manifest = getManifest(),
        rawURL = config.rawURL,
        repoURL = config.repository,
        manifestRoot = manifest!.root;

    if (!config)
        cb(Error("foundryconfig.json not found"));
    if (manifest === null) {
        cb(Error("Manifest JSON not found"));
        return;
    }
    if (!rawURL || !repoURL)
        cb(Error("Repository URLs not configured in foundryconfig.json"));

    try {
        const version = argv.update || argv.u;

        /* Update version */

        const versionMatch = /^(\d{1,}).(\d{1,}).(\d{1,})$/;
        const currentVersion = manifest!.file.version;
        let targetVersion = "";

        if (!version) {
            cb(Error("Missing version number"));
        }

        if (versionMatch.test(version)) {
            targetVersion = version;
        } else {
            targetVersion = currentVersion.replace(versionMatch, (substring: string, major: string, minor: string, patch: string) => {
                console.log(substring, Number(major) + 1, Number(minor) + 1, Number(patch) + 1);
                if (version === "major") {
                    return `${Number(major) + 1}.0.0`;
                } else if (version === "minor") {
                    return `${major}.${Number(minor) + 1}.0`;
                } else if (version === "patch") {
                    return `${major}.${minor}.${Number(patch) + 1}`;
                } else {
                    return "";
                }
            });
        }

        if (targetVersion === "") {
            return cb(Error("Error: Incorrect version arguments."));
        }

        if (targetVersion === currentVersion) {
            return cb(Error("Error: Target version is identical to current version."));
        }

        Logger.Ok(`Updating version number to '${targetVersion}'`);

        packageJson.version = targetVersion;
        manifest.file.version = targetVersion;

        /* Update URLs */

        const result = `${repoURL}/releases/download/${manifest.file.version}/module.zip`;

        manifest.file.url = repoURL;
        manifest.file.manifest = `${rawURL}/${manifest.file.version}/${manifestRoot}/${manifest.name}`;
        manifest.file.download = result;

        const prettyProjectJson = stringify(manifest.file, {
            maxLength: 35,
            indent: "\t",
        });

        fs.writeFileSync("package.json", JSON.stringify(packageJson, null, '\t'));
        fs.writeFileSync(path.join(manifest.root, manifest.name), prettyProjectJson, "utf8");

        return cb();
    } catch (err) {
        cb(err);
    }
}
const test = () => {
    return gulp.src('Source/__tests__').pipe(jest({
        "preprocessorIgnorePatterns": [
            "dist/", "node_modules/"
        ],
        "automock": false
    }));
}


const execBuild = gulp.parallel(buildTS, buildLess, copyFiles);

exports.build = gulp.series(clean, execBuild, bundleModule, cleanDist);
exports.watch = buildWatch;
exports.clean = clean;
exports.link = linkUserData;
exports.package = packageBuild;
exports.update = updateManifest;
exports.publish = gulp.series(clean, updateManifest, execBuild, bundleModule, cleanDist, packageBuild);
