"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWriter = void 0;
var fs = require("fs");
var path = require("path");
/**
 * Writes ARM templates and manifest to disk
 */
var FileWriter = /** @class */ (function () {
    function FileWriter() {
    }
    /**
     * Write ARM templates to disk
     *
     * @param outdir - Output directory
     * @param stacks - Map of stack name to ARM template
     * @param prettyPrint - Whether to pretty-print JSON
     * @returns Cloud assembly with manifest
     */
    FileWriter.prototype.write = function (outdir, stacks, prettyPrint) {
        if (prettyPrint === void 0) { prettyPrint = true; }
        // Create output directory
        this.ensureDirectory(outdir);
        var stackManifests = {};
        // Write each stack template
        for (var _i = 0, _a = stacks.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], stackName = _b[0], template = _b[1];
            var templatePath = path.join(outdir, "".concat(stackName, ".json"));
            var relativePath = path.relative(outdir, templatePath);
            // Write template file
            this.writeJsonFile(templatePath, template, prettyPrint);
            // Create stack manifest
            stackManifests[stackName] = {
                name: stackName,
                templatePath: relativePath,
                resourceCount: template.resources.length,
                parameterCount: Object.keys(template.parameters || {}).length,
                outputCount: Object.keys(template.outputs || {}).length,
                dependencies: this.extractDependencies(template),
            };
        }
        // Create cloud assembly
        var assembly = {
            version: '1.0.0',
            stacks: stackManifests,
            directory: outdir,
        };
        // Write manifest file
        var manifestPath = path.join(outdir, 'manifest.json');
        this.writeJsonFile(manifestPath, assembly, prettyPrint);
        return assembly;
    };
    /**
     * Ensure directory exists with proper permissions
     */
    FileWriter.prototype.ensureDirectory = function (dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 493 });
        }
    };
    /**
     * Write JSON file with proper formatting
     */
    FileWriter.prototype.writeJsonFile = function (filePath, data, prettyPrint) {
        var json = prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        fs.writeFileSync(filePath, json, { mode: 420, encoding: 'utf-8' });
    };
    /**
     * Extract dependencies from template
     */
    FileWriter.prototype.extractDependencies = function (template) {
        var dependencies = new Set();
        for (var _i = 0, _a = template.resources; _i < _a.length; _i++) {
            var resource = _a[_i];
            if (resource.dependsOn) {
                for (var _b = 0, _c = resource.dependsOn; _b < _c.length; _b++) {
                    var dep = _c[_b];
                    // Extract resource type from dependsOn string
                    var match = dep.match(/'([^']+)'/);
                    if (match) {
                        dependencies.add(match[1]);
                    }
                }
            }
        }
        return Array.from(dependencies);
    };
    /**
     * Clean output directory
     */
    FileWriter.prototype.clean = function (outdir) {
        if (fs.existsSync(outdir)) {
            var files = fs.readdirSync(outdir);
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                var filePath = path.join(outdir, file);
                var stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    this.clean(filePath);
                    fs.rmdirSync(filePath);
                }
                else {
                    fs.unlinkSync(filePath);
                }
            }
        }
    };
    return FileWriter;
}());
exports.FileWriter = FileWriter;
