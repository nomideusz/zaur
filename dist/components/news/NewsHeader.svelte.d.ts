import type { ZaurMood } from './types.js';
interface $$__sveltets_2_IsomorphicComponent<Props extends Record<string, any> = any, Events extends Record<string, any> = any, Slots extends Record<string, any> = any, Exports = {}, Bindings = string> {
    new (options: import('svelte').ComponentConstructorOptions<Props>): import('svelte').SvelteComponent<Props, Events, Slots> & {
        $$bindings?: Bindings;
    } & Exports;
    (internal: unknown, props: Props & {
        $$events?: Events;
        $$slots?: Slots;
    }): Exports & {
        $set?: any;
        $on?: any;
    };
    z_$$bindings?: Bindings;
}
declare const NewsHeader: $$__sveltets_2_IsomorphicComponent<{
    zaurMood?: ZaurMood;
    zaurThoughts?: string | null;
}, {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type NewsHeader = InstanceType<typeof NewsHeader>;
export default NewsHeader;
