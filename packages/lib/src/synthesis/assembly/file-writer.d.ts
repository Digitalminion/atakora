import { ArmTemplate, CloudAssembly } from '../types';
/**
 * Writes ARM templates and manifest to disk
 */
export declare class FileWriter {
    /**
     * Write ARM templates to disk
     *
     * @param outdir - Output directory
     * @param stacks - Map of stack name to ARM template
     * @param prettyPrint - Whether to pretty-print JSON
     * @returns Cloud assembly with manifest
     */
    write(outdir: string, stacks: Map<string, ArmTemplate>, prettyPrint?: boolean): CloudAssembly;
    /**
     * Ensure directory exists with proper permissions
     */
    private ensureDirectory;
    /**
     * Write JSON file with proper formatting
     */
    private writeJsonFile;
    /**
     * Extract dependencies from template
     */
    private extractDependencies;
    /**
     * Clean output directory
     */
    clean(outdir: string): void;
}
//# sourceMappingURL=file-writer.d.ts.map