declare const GENERATORS: string[];
export type Project = {
    backend: string;
    tm: string;
    gen: string;
    pkg: string;
    pkgtm: string;
};
declare function resolveProject(start: string): Project;
export type TemplateRow = {
    name: string;
    kind: 'fragment' | 'generator';
    layer: string;
};
declare function listTemplates(start: string): TemplateRow[];
declare function ejectFragment(start: string, name: string): string;
declare function ejectCode(start: string, name: string): string;
export type DiffRow = {
    name: string;
    upstream: 'unchanged' | 'changed' | 'missing';
    diff?: string;
};
declare function diffTemplates(start: string): DiffRow[];
export { resolveProject, listTemplates, ejectFragment, ejectCode, diffTemplates, GENERATORS, };
